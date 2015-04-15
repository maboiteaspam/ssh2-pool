# SSH2Pool

A library to run multiple ssh commands across multiple machines and get stream or output.
It also helps to deal with file transfer across multiple hosts.

# Install

```npm i ssh2-pool --save```

# Usage

```js
var SSH2Pool = require('ssh2-pool');

var servers = 
 {
  ':pool1':[
    'machine1'
  ],
  'machine1':{
    'ssh':{
      // ssh2 options
      host: 'ddd',
      port: 22,
      userName: 'some',
      password: 'credentials with password'
      // or key
    }
  }
 };

var pool = new SSH2Pool(servers);



var cmds = [
  'sudo ls -al',
  'msg:`All done!`' // see cmp-202/ssh2shell
];
var itsFine = true;
var hostDone = function(server, response){
  if(itsFine){
    itsFine = !!response.match(/Has errors or not ?/);
  }
};
pool.env(env).runMultiple(cmds, hostDone, function(){
  if(itsFine){
    pool.env(env).runMultiple(['echo "do something else because its fine"'], function(){
      console.log('done');
    });
  }
});





var localPath = '/tmp/from_local_path';
var remotePath = '/tmp/to_remote_path';

pool.env(env).putDir(localPath, remotePath, function(){
  console.log('done');
});



var localPath = '/tmp/from_local_path';
var remotePath = '/tmp/to_remote_path';

pool.env(env).forEach(function(server,serverConfig){
    server.sftpPutDir(localPath, remotePath, function(){
      console.log('done '+serverConfig.name);
    });
});
```

# Status

In development. It needs some tests. It misses putFile and readDir implementations.