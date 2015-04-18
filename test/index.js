
require('should');
var fs = require('fs');

var pwd = {};
if( process.env['TRAVIS'] )
  pwd = require('./travis-ssh.json');
else
  pwd = require('./vagrant-ssh.json');

var SSH2Pool = require('../index.js');

var servers =
{
  ':pool1':['machine1'],
  'machinePwd':{
    'ssh':{
      host: 'localhost',
      port: pwd.localhost.port || 22,
      userName: pwd.localhost.user,
      password: pwd.localhostpwd.pwd || ''
    }
  },
  'machineKey':{
    'ssh':{
      host: 'localhost',
      port: pwd.localhostpwd.port || 22,
      userName: pwd.localhostpwd.user,
      password: pwd.localhostpwd.pwd || '',
      privateKey: pwd.localhost.privateKey?fs.readFileSync(pwd.localhost.privateKey):null
    }
  },
  'wrongPwd':{
    'ssh':{
      host: 'localhost',
      port: pwd.localhost.port || 22,
      userName: 'wrong',
      password: pwd.localhostpwd.pwd || ''
    }
  },
  'wrongKey':{
    'ssh':{
      host: 'localhost',
      port: pwd.localhostpwd.port || 22,
      userName: 'wrong',
      password: pwd.localhostpwd.pwd || ''
    }
  }
};

var pool = new SSH2Pool(servers);
pool.log.level = 'silly';

var machine = 'machinePwd';
if( process.env['TRAVIS'] ){
  machine = 'machineKey';
}


if( !process.env['TRAVIS'] ){

  var hasBooted = true;

  before(function(done){
    var vagrant = require('child_process').spawn('vagrant',['up'])
    vagrant.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
      if(hasBooted && data.toString().match(/already running/) ) hasBooted = false;
    });
    vagrant.stderr.on('data', function (data) {
      console.log('stderr: ' + data);
    });
    vagrant.on('close', function (code) {
      console.log('child process exited with code ' + code);
      done();
    });
    this.timeout(50000);
  });

  after(function(done){
    if(hasBooted){
      var vagrant = require('child_process').spawn('vagrant',['halt'])
      vagrant.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
      });
      vagrant.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
      });
      vagrant.on('close', function (code) {
        console.log('child process exited with code ' + code);
        done();
      });
      this.timeout(50000);
    } else {
      done();
    }
  });

}


describe('ident', function(){

  this.timeout(50000)

  it('exec can fail properly with password', function(done){
    pool.env('wrongPwd').exec(['ls -alh'], function(sessionErr, sessionText){
      (sessionText).should.eql('\n');
      done();
    });
  });

  it('run can fail properly with private key', function(done){
    pool.env('wrongKey').run('ls -alh', function(err, stdout, stderr){
      (err).should.be.true;
      (stdout===null).should.be.true;
      (stderr).should.match(/failed/);
      done();
    });
  });

});

describe('exec', function(){

  this.timeout(50000);

  it('can execute command', function(done){
    pool.env('machinePwd').exec(['ls -alh ~'], function(sessionErr, sessionText){
      sessionText.should.match(new RegExp(servers.machinePwd.ssh.username));
      done()
    });
  });

  it('can execute command with private key', function(done){
    pool.env('machineKey').exec(['ls -alh ~'], function(sessionErr, sessionText){
      sessionText.should.match(new RegExp(servers.machinePwd.ssh.username));
      done()
    });
  });

  it('can execute sudo command', function(done){
    this.timeout(50000)
    pool.env('machinePwd').exec(['sudo ls -alh'], function(sessionErr, sessionText){
      sessionText.should.match(new RegExp(servers.machinePwd.ssh.username));
      done();
    });
  });

  it('can connect with private key and execute sudo command', function(done){
    this.timeout(50000)
    pool.env('machineKey').exec(['sudo ls -alh'], function(sessionErr, sessionText){
      sessionText.should.match(new RegExp(servers.machineKey.ssh.username));
      done();
    });
  });

  it('can fail properly', function(done){
    pool.env('machinePwd').exec('ls -alh /var/log/nofile', function(sessionErr, sessionText){
      console.log(sessionErr)
      console.log(sessionText)
      sessionText.should.match(/No such file or directory/);
      done();
    });
  });

  it('can fail properly', function(done){
    pool.env('machinePwd').exec('dsscdc', function(sessionErr, sessionText){
      console.log(sessionErr)
      console.log(sessionText)
      sessionText.should.match(/command not found/);
      done();
    });
  });

});


describe('run', function(){

  this.timeout(50000);

  it('can run sudo command with password', function(done){
    pool.env('machinePwd').run('sudo tail -f /var/log/{auth.log,secure}', function(err, stdouts, stderrs, server, conn){
      (err).should.be.false;
      var stdout = '';
      stdouts.on('data', function(data){
        stdout+=''+data;
      });
      setTimeout(function(){
        stdout.toString().should.match(/session/);
        conn.end();
        done();
      },2000);
    });
  });

  it('can connect with private key and run sudo command with password', function(done){
    pool.env('machineKey').run('sudo tail -f /var/log/{auth.log,secure}', function(err, stdouts, stderrs, server, conn){
      (err).should.be.false;
      var stdout = '';
      stdouts.on('data', function(data){
        stdout+=''+data;
      });
      setTimeout(function(){
        stdout.toString().should.match(/session/);
        conn.end();
        done();
      },2000);
    });
  });

  it('run can fail properly', function(done){
    pool.env('machinePwd').run('ls -alh /var/log/nofile', function(err, stdouts, stderrs, server, conn){
      var stdout = '';
      var stderr = '';
      stdouts.on('data', function(data){
        stdout+=''+data;
      });
      stderrs.on('data', function(data){
        stderr+=''+data;
      });
      setTimeout(function(){
        stderr.should.match(/No such file or directory/);
        stdout.should.be.empty;
        conn.end();
        done();
      },1000);
      (err).should.be.false;
    });
  });
  it('run can fail properly', function(done){
    pool.env('machinePwd').run('dsscdc', function(err, stdouts, stderrs, server, conn){
      var stdout = '';
      var stderr = '';
      stdouts.on('data', function(data){
        stdout+=''+data;
      });
      stderrs.on('data', function(data){
        stderr+=''+data;
      });
      setTimeout(function(){
        stderr.should.match(/command not found/)
        stdout.should.be.empty;
        conn.end();
        done();
      },1000);
      (err).should.be.false;
    });
  });
});

