
var fs = require('fs');
var path = require('path');

var pwd = require('./pwd.json');
/*
 var pwd = {
   "localhost":{
     "user":"some",
     "pwd":"cred",
     "privateKey":"/absolute/path/to/.ssh/id_dsa"
   }
 };
*/

var SSH2Pool = require('../index.js');

// with password
(function(){

  var servers = {
    'locals':['local'],
    'local':{
      ssh:{
        'host':'127.0.0.1',
        port: 22,
        username: pwd.localhost.user,
        password: pwd.localhost.pwd
      }
    }
  };
  var pool = new SSH2Pool(servers);
  pool.log.level = 'verbose';

  pool.env('local').run('ls -alh', function(err, stream, stderr, server, conn){
    if(err) return console.log(err)
    stream.on('data', function(d){
      console.log(d+'')
      console.log(server)
      stream.write('\nexit\n')
    });
    stderr.on('data', function(d){
      console.log(d+'')
    });
    stream.on('close', function(){
      conn.end();
    });
  });
})();

// with key
(function(){

  var servers = {
    'locals':['local'],
    'local':{
      ssh:{
        'host':'localhost',
        username: pwd.localhost.user,
        privateKey: fs.readFileSync(pwd.localhost.privateKey) // note that ~/ is not recognized
      }
    }
  };
  var pool = new SSH2Pool(servers);
  pool.log.level = 'verbose';

  pool.env('local').run('ls -alh', function(err, stream, stderr, server, conn){
    if(err) return console.log(err)
    stream.on('data', function(d){
      console.log(d+'')
      console.log(server)
      stream.write('\nexit\n')
    });
    stderr.on('data', function(d){
      console.log(d+'')
    });
    stream.on('close', function(){
      conn.end();
    });
  });
})();
