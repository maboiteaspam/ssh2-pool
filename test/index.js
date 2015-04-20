
process.env['NPM_LOG'] = process.env['NPM_LOG']
|| 'silly'
|| 'info'
|| 'verbose'
;

require('should');
var fs = require('fs');

var pwd = {};
if( process.env['TRAVIS'] )
  pwd = require('./travis-ssh.json');
else
  pwd = require('./vagrant-ssh.json');

var SSH2Pool = require('../index.js');
var Vagrant = require('node-vagrant-bin');
var log = require('npmlog');

var servers =
{
  ':pool1':['machine1'],
  'machinePwd':{
    'ssh':{
      host: pwd.localhost.host || 'localhost',
      port: pwd.localhost.port || 22,
      userName: pwd.localhost.user,
      password: pwd.localhost.pwd || undefined,
      privateKey: pwd.localhost.privateKey?fs.readFileSync(pwd.localhost.privateKey):undefined
    }
  },
  'machineKey':{
    'ssh':{
      host: pwd.localhostpwd.host || 'localhost',
      port: pwd.localhostpwd.port || 22,
      userName: pwd.localhostpwd.user,
      password: pwd.localhostpwd.pwd || undefined,
      privateKey: pwd.localhostpwd.privateKey?fs.readFileSync(pwd.localhostpwd.privateKey):undefined
    }
  },
  'wrongPwd':{
    'ssh':{
      host: pwd.localhost.host || 'localhost',
      port: pwd.localhost.port || 22,
      userName: 'wrong',
      password: pwd.localhost.pwd || undefined,
      privateKey: pwd.localhost.privateKey?fs.readFileSync(pwd.localhost.privateKey):undefined
    }
  },
  'wrongKey':{
    'ssh':{
      host: pwd.localhostpwd.host || 'localhost',
      port: pwd.localhostpwd.port || 22,
      userName: 'wrong',
      password: pwd.localhostpwd.pwd || undefined,
      privateKey: pwd.localhostpwd.privateKey?fs.readFileSync(pwd.localhostpwd.privateKey):undefined
    }
  }
};

var pool = new SSH2Pool(servers);

var machine = 'machinePwd';
if( process.env['TRAVIS'] ){
  machine = 'machineKey';
  log.level = 'silly';
}


if( !process.env['TRAVIS'] ){
  var vagrant = new Vagrant();

  var hasBooted = true;

  before(function(done){
    this.timeout(50000);
    vagrant.isRunning(function(running){
      if(running===false){
        vagrant.up('precise64',function(err,booted){
          hasBooted = booted;
          done();
        });
      }else{
        console.log('running machine '+running);
        hasBooted = false;
        done();
      }
    });
  });

  after(function(done){
    this.timeout(50000);
    vagrant.isRunning(function(running){
      console.log('running machine '+running);
      if(hasBooted){
        vagrant.halt(function(){
          console.log('halted');
          done();
        });
      } else {
        done();
      }
    });
  });

}


describe('ident', function(){

  this.timeout(50000)

  it('exec can fail properly with password', function(done){
    pool.env('wrongPwd').exec(['ls -alh'], function(sessionErr, sessionText){
      (sessionText).should.match(/error/);
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
      sessionText.should.match(/(No such file or directory|Aucun fichier ou dossier de ce type)/);
      done();
    });
  });

  it('can fail properly', function(done){
    pool.env('machinePwd').exec(['dsscdc'], function(sessionErr, sessionText){
      sessionText.should.match(/(command not found|commande inconnue)/);
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
      stdouts.on('close', function(){
        stdout.should.match(/No such file or directory/);
        stderr.should.be.empty;
        conn.end();
        done();
      });
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
      stdouts.on('close', function(){
        stdout.should.match(/command not found/)
        stderr.should.be.empty;
        conn.end();
        done();
      });
      (err).should.be.false;
    });
  });
});

