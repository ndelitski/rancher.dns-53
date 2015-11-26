import {exec, execSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import {pairs} from 'lodash';
import {delay} from 'bluebird';
import {info, debug, error} from './log';

export default class Haproxy {
  constructor({port = 80} = {}) {
    this._port = port;
    this._configPath = '/etc/haproxy/haproxy.cfg'
  }
  restart() {
    info('restarting haproxy');
    execSync(`/usr/sbin/haproxy -D -f ${this._configPath} -p /var/run/haproxy.pid  -sf $(cat /var/run/haproxy.pid)`);
    this._pid = fs.readFileSync('/var/run/haproxy.pid', 'utf8');
    info(`haproxy pid: ${this._pid}`);
  }
  async reloadServices(services) {
    const configContent = this.generateConfig(services);
    if (this._prevConfig == configContent) {
      debug('haproxy config was not changed, no need reload');
      return;
    }
    debug(`generated haproxy.conf:\n${configContent}`);
    fs.writeFileSync(this._configPath, configContent, 'utf8');
    this._prevConfig = configContent;
    this.restart();
  }
  generateConfig(services) {
    let config = `global
log 127.0.0.1 local0
log 127.0.0.1 local1 notice

defaults
  log global
  mode http
  option httplog
  option dontlognull
  option forwardfor
  timeout connect 5000ms
  timeout client 50000ms
  timeout server 50000ms

frontend front
  bind *:${this._port}
`;

    let index = 0;

    for (let [cname] of pairs(services)) {
      config+=`  acl ${index}_host hdr(host) -i ${cname}
  use_backend backend_${index} if ${index}_host
`;
      index++;
    }
    index = 0;
    for (let [_, addresses] of pairs(services)) {
      config += `
backend backend_${index}
  mode http
  balance roundrobin
  timeout check 5000
`;
    let serverIndex = 0;
    for(let address of addresses) {
      const port = address.split(':')[1] || 80;
      config += `  server server_${serverIndex++} ${address} check port ${port} inter 5000 rise 2 fall 3
`;
    }

      index++;
    }
    return config;
  }
}
