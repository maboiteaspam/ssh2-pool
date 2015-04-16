
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

var fixture = __dirname+'/fixture/';

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

  pool.env('local').putDir(fixture+'/dir/',fixture+'/dir2/', function(err){
    if(err) return console.log(err)
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

  pool.env('local').putDir(fixture+'/dir/',fixture+'/dir3/', function(err){
    if(err) return console.log(err)
  });
})();
