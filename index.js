
var SSH2Utils = require("ssh2-utils");
var async = require('async');
var log = require('npmlog');
var _ = require('underscore');
var pkg = require('./package.json');

log.level = process.env['NPM_LOG'] || 'info';

var ssh = new SSH2Utils();

var ServerList = function(servers){
  this.list = servers;
  this.length = servers.length;
};

/**
 *
 * @returns {{}}
 */
ServerList.prototype.toJson = function(){
  var ret = {};
  this.list.forEach(function(serverConfig){
    ret[serverConfig.name] = serverConfig;
  });
  return ret;
};

/**
 *
 * @param cb
 */
ServerList.prototype.forEach = function(cb){
  this.list.forEach(function(serverConfig){
    var server = new ServerList(serverConfig);
    cb(server, serverConfig);
  });
};

/**
 * Find machines
 * exposing given service name
 *
 * @param name
 * @returns {ServerList}
 */
ServerList.prototype.byService = function(name){
  var servers = [];
  this.list.forEach(function(serverConfig){
    if( name in serverConfig ){
      servers.push(serverConfig);
    }
  });
  return new ServerList(servers);
};
/**
 * Put a local path to multiple hosts.
 *
 * @param localPath
 * @param remotePath
 * @param then
 */
ServerList.prototype.putDir = function(localPath, remotePath, then){
  var putSerie = [];
  this.forEach(function(server, serverConfig){
    putSerie.push(function(done){
      ssh.putDir(serverConfig.ssh, localPath, remotePath, function(){
        done();
      });
    });
  });
  async.parallelLimit(putSerie, 4, then);
};
/**
 * Put a local file to multiple hosts.
 *
 * @todo
 *
 * @param localPath
 * @param remotePath
 * @param then
 */
ServerList.prototype.putFile = function(localPath, remotePath, then){
  throw 'todo';
};
/**
 * Run multiple commands on multiple hosts.
 *
 * @param cmds
 * @param hostDone
 * @param done
 */
ServerList.prototype.exec = function(cmds,  hostDone, done){
  if(!done){
    done = hostDone;
    hostDone = null;
  }
  var sshSerie = [];
  var allSessionText = '';
  var allSessionErr = true;
  this.forEach(function(server, serverConfig){

    var sCmds = cmds;
    if(_.isFunction(sCmds) ) sCmds = sCmds(serverConfig);
    if(_.isString(sCmds) ) sCmds = [sCmds];

    sshSerie.push(function(then){

      serverConfig.ssh.name = serverConfig.name;

      ssh.runMultiple(serverConfig.ssh, sCmds, function(err, sessionText){
        if(err) sessionText += err+'\n';
        allSessionText += sessionText+'';
        allSessionErr = err && allSessionErr;
        if(hostDone) hostDone(err, sessionText, server);
        if(then) then();
      });
    });
  });

  async.parallelLimit(sshSerie, 8, function(){
    if(done) done(allSessionErr, allSessionText);
  });

};
/**
 * Run a command on multiple hosts and returns their streams.
 *
 * @param cmd
 * @param hostReady
 */
ServerList.prototype.run = function(cmd,  hostReady ){
  this.forEach(function(server, serverConfig){
    var sCmd = cmd;
    if(_.isFunction(sCmd) ) sCmd = sCmd(serverConfig);
    ssh.run(serverConfig.ssh, sCmd, hostReady);
  });
};


/**
 * Object of named servers and environments.
 *
 * servers are named such
 *  machine1
 *  machine2
 * environments are named such
 *  :pool1
 *  :pool2
 *
 * {
 *  ':pool1':[
 *    'machine1'
 *  ],
 *  'machine1':{
 *    'ssh':{
 *      // ssh2 options
 *      host: 'ddd',
 *      port: 22,
 *      userName: 'some',
 *      password: 'credentials with password'
 *      // or key
 *    }
 *  }
 * }
 *
 *
 * If name is an environment,
 *  it is noted such :environment_name
 *  it is an array such ['machine name1','machine name2']
 *
 *
 * @param servers
 * @constructor
 */
var ServerPool = function(servers){
  this.data = servers;
};

/**
 * Scan servers list for a given name.
 * If name is an environment,
 *  it is noted such :environment_name
 *  it is an array such ['machine name1','machine name2']
 *  They ll be resolved to an appropriate list of servers.
 *
 * @param name
 * @returns {ServerList}
 */
ServerPool.prototype.env = function(name){
  var data = this.data;
  var servers = [];
  if( (!!name.match(/^:/)) ){
    if( name == ':all' ){
      data.forEach(function(name){
        if(!name.match(/^[:]/)){
          data[name].name = name;
          servers.push(data[name]);
        }
      });
    }
    if( data[name] ){
      data[name].forEach(function(name){
        data[name].name = name;
        servers.push(data[name]);
      });
    }
  }else if(data[name]){
    data[name].name = name;
    servers.push(data[name])
  } else {
    throw 'env is undefined : ' + name;
  }
  return new ServerList(servers);
};

module.exports = ServerPool;