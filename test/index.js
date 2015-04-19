
require('should');
var fs = require('fs');
var spawn = require('child_process').spawn;

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
      host: pwd.localhost.host || 'localhost',
      port: pwd.localhost.port || 22,
      userName: pwd.localhost.user,
      password: pwd.localhostpwd.pwd || ''
    }
  },
  'machineKey':{
    'ssh':{
      host: pwd.localhostpwd.host || 'localhost',
      port: pwd.localhostpwd.port || 22,
      userName: pwd.localhostpwd.user,
      password: pwd.localhostpwd.pwd || '',
      privateKey: pwd.localhost.privateKey?fs.readFileSync(pwd.localhost.privateKey):null
    }
  },
  'wrongPwd':{
    'ssh':{
      host: pwd.localhost.host || 'localhost',
      port: pwd.localhost.port || 22,
      userName: 'wrong',
      password: pwd.localhostpwd.pwd || ''
    }
  },
  'wrongKey':{
    'ssh':{
      host: pwd.localhostpwd.host || 'localhost',
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
var log = require('npmlog');


if( !process.env['TRAVIS'] ){
  var Vagrant = (function(){
    function Vagrant(opts){
      this.options = opts || {};
    }
    var spawnVagrant = function(args){
      var vagrant = spawn('vagrant',args);
      log.verbose('vagrant', 'vagrant '+args.join(' '))
      var stdout = '';
      var stderr = '';
      vagrant.stdout.on('data', function (data) {
        log.silly('vagrant', '%s', data);
        stdout+=''+data;
      });
      vagrant.stderr.on('data', function (data) {
        log.error('vagrant', '%s', data);
        stderr+=''+data;
      });
      vagrant.on('close', function (code) {
        log.error('vagrant', 'close code %s', code);
        vagrant.emit('done', code, stdout, stderr);
      });
      return vagrant;
    };
    Vagrant.prototype.up = function(machine, done){
      var provider = this.options.provider || 'virtualbox';
      var vagrant = spawnVagrant(['up', machine, '--provider='+provider]);
      var booted = null;
      vagrant.on('data',function(data){
        data += '';
        if(data.match(/Machine booted and ready!/)){
          booted = true;
        }
        if(data.match(/is already running.$/)){
          booted = false;
        }
      });
      vagrant.on('done',function(code, stdout, stderr){
        if(done) done(stderr,booted);
      });
      return vagrant;
    };
    Vagrant.prototype.halt = function(done){
      var vagrant = spawnVagrant(['halt']);
      vagrant.on('done',function(code, stdout, stderr){
        //if(data.match(reg) ){
        //}
        if(done) done(false);
      });
      return vagrant;
    };
    Vagrant.prototype.status = function(done){
      var machines = {};
      var reg = /([a-z0-9-_]+)\s+(running|poweroff)\s+[(](virtualbox|libvirt)[)]/i;
      var vagrant = spawnVagrant(['status']);
      vagrant.stdout.on('data', function (data) {
        data += '';
        data.split('\n').forEach(function(line){
          var regRes = line.match(reg);
          if(regRes ){
            var name = regRes[1];
            machines[name] = {
              status:regRes[2],
              provider:regRes[3]
            };
          }
        })
      });
      vagrant.on('done',function(code, stdout, stderr){
        if(done) done(stderr,machines);
      });
      return vagrant;
    };
    Vagrant.prototype.isRunning = function(done){
      this.status(function(errors,machines){
        var running = false;
        Object.keys(machines).forEach(function(name){
          if(machines[name].status == 'running' ){
            running = name;
          }
        });
        if(done)done(running);
      });
      return vagrant;
    };
    return Vagrant;
  })();

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
      sessionText.should.match(/No such file or directory/);
      done();
    });
  });

  it('can fail properly', function(done){
    pool.env('machinePwd').exec('dsscdc', function(sessionErr, sessionText){
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

