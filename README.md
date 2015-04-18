# SSH2Pool

A library to run multiple ssh commands across multiple machines and get stream or output.
It also helps to deal with file transfer across multiple hosts.

---------------------------------------


# Install

```npm i ssh2-pool --save```

---------------------------------------

### API

* [`ServerPool`](#ServerPool)
    * [`ServerPool.env`](#env)

* [`ServerList`]()
    * [`ServerList.exec`](#exec)
    * [`ServerList.run`](#run)
    * [`ServerList.putDir`](#putDir)
    * [`ServerList.putFile`](#putFile)

---------------------------------------


<a name="ServerPool" />
### new ServerPool(servers)

ServerPool constructor.

__Arguments__

* `servers` - An object of server pool.

__Examples__

```js
    var SSH2Pool = require('ssh2-pool');
    
    var servers = 
     {
      ':pool1':['machine1'],
      'machine1':{
        'ssh':{host:'localhost', port:2222, userName:'vagrant',password:'vagrant'}
      }
     };
    
    var pool = new SSH2Pool(servers);
```


<a name="ServerPool.env" />
### ServerPool.env(name)

Select a pool of machines.

__Arguments__

* `name` - Name of an environment or a machine.

__Returns__

* `ServerList` - A ServerList object.

__Examples__

```js
    var SSH2Pool = require('ssh2-pool');
    
    var servers = 
     {
      ':pool1':['machine1'],
      'machine1':{
        'ssh':{host:'localhost', port:2222, userName:'vagrant',password:'vagrant'}
      }
     };
    
    var pool = new SSH2Pool(servers);
    
    pool.env('machine1'); // is a list containing 'machine1' properties
    pool.env(':pool1'); // is also a list containing 'machine1' properties
```

---------------------------------------


<a name="ServerList.exec" />
### ServerList.exec(cmds, onHostComplete, onDone)
##### ServerList.exec(cmds, onDone)

Execute an Array of commands on server pool and return their output.

__Arguments__

* `cmds` - An Array of commands to execute on server pool.
* `onHostComplete(sessionText, server)` - A callback called on command line completion. 
    `sessionText` the completed command line response including the command line.
    `server` An ssh server credentials object.
* `onDone(sessionText)` - A callback called on session completion. 
    `sessionText` the completed session response.

__Examples__

```js
    var SSH2Pool = require('ssh2-pool');
    
    var servers = 
     {
      ':pool1':['machine1'],
      'machine1':{
        'ssh':{host:'localhost', port:2222, userName:'vagrant',password:'vagrant'}
      }
     };
    
    var pool = new SSH2Pool(servers);
    
    pool.env(':pool1').exec(['ls','time'], function(sessionText){
        console.log(sessionText);
    });
```


<a name="ServerList.run" />
### ServerList.run(cmd, hostReady)

A command to execute on a server pool and return their streams.

__Arguments__

* `cmd` - A command to execute on server pool.
* `hostReady(err,stdout,stderr,server,conn)` - A callback called on command line sent. 
    `err` isa Boolean.
    `stdout` `stderr` are Streams.
    `server` An ssh server credentials object.
    `conn` An ssh Client object.

__Examples__

```js
    var SSH2Utils = require('ssh2-utils');
    
    var server = {host: "localhost", username:"user", password:"pwd" };
    
    var ssh = new SSH2Utils();
    
    ssh.run(server, 'ls', function(err,stdout,stderr){
        if(err) console.log(err);
        stdout.on('data', function(){
            console.log(''+data);
        });
        stderr.on('data', function(){
            console.log(''+data);
        });
        stdout.on('close',function(){
            conn.end();
        });
    });
```


<a name="ServerList.putFile" />
### ServerList.putFile(localFile, remotePath, then)

Put local file on a remote hosts of a server pool.

__Arguments__

* `localFile` - A local file path to read.
* `remotePath` - A remote file path to write.
* `then(err)` - A callback called once all files sent. 
    `err` is an Error.

__Examples__

```js
    var SSH2Utils = require('ssh2-utils');
    
    var server = {host: "localhost", username:"user", password:"pwd" };
    
    var ssh = new SSH2Utils();
        
    var localFile = '/tmp/from_local_path';
    var remotePath = '/tmp/to_remote_path';
    
    pool.env(env).putFile(localFile, remotePath, function(err){
        if(err) console.log(err);
        console.log('done');
    });
```


<a name="ServerList.putDir" />
### ServerList.putDir(localFile, remotePath, then)

Put local directory on a remote hosts of a server pool.

__Arguments__

* `localDirectoryPath` - A local directory path to read.
* `remotePath` - A remote file path to write.
* `then(err)` - A callback called once all files sent. 
    `err` is an Error.

__Examples__

```js
    var SSH2Utils = require('ssh2-utils');
    
    var server = {host: "localhost", username:"user", password:"pwd" };
    
    var ssh = new SSH2Utils();
        
    var localDirectoryPath = '/tmp/from_local_path';
    var remotePath = '/tmp/to_remote_path';
    
    pool.env(env).putDir(localDirectoryPath, remotePath, function(err){
        if(err) console.log(err);
        console.log('done');
    });
```

---------------------------------------


# Status

In development. It needs some tests. It misses putFile and readDir implementations.