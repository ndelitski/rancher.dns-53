import RancherClient from './rancher';
import resolveConfig from './config';
import _, {pluck} from 'lodash';
import {info, debug, error} from './log';
import {json} from './helpers';
import Promise, {all, delay} from 'bluebird';
import assert from 'assert';
import Route53 from './route53';
import Haproxy from './haproxy';

(async () => {
  const config = await resolveConfig();
  info(`started with config:\n${stringify(config)}`);
  assert(config.interval, '`interval` is missing');
  assert(config.hostZoneId, '`hostZoneId` is missing');
  assert(config.aws, '`aws` is missing');
  assert(config.aws.accessKeyId, '`aws.accessKeyId` is missing');
  assert(config.aws.secretAccessKey, '`aws.secretAccessKey` is missing');

  const route53 = new Route53({hostZoneId: config.hostZoneId, aws: config.aws});
  const domain = (await route53.getDomain()).replace(/\.$/, '');
  const rancher = new RancherClient(config.rancherMetadata);
  const environment = await rancher.getEnvironment();
  const publicIP = await getEC2PublicIP();
  info(`Public IP is: ${publicIP}`);
  const proxy = new Haproxy();

  while(true) {
    await tick();
    await delay(config.interval);
  }

  async function tick() {
    debug('tick');

    const containers = await rancher.getContainers();
    const records = {};
    const services = {};
    for (let container of containers) {
      if (container.service_name && container.stack_name && container.labels['io.rancher.route53'] == 'true') {
        const name = fqdn({
          service: container.service_name,
          stack: container.stack_name,
          environment,
          domain
        });

        const targetPortLabel = container.labels['io.rancher.route53.target_port'];

        if (!targetPortLabel) {
          info(`ignore ${container.stack_name}/${container.service_name} due to no 'io.rancher.route53.target_port' label`);
          continue;
        }

        const containerPort = parseInt(targetPortLabel);
        const containerIP = container.primary_ip;
        if (!services[name]) {
          services[name] = [`${containerIP}:${containerPort}`]
        } else {
          services[name].push(`${containerIP}:${containerPort}`);
        }

        records[name + '.'] = [publicIP];
      }
    }

    debug(json`services:\n${services}`);
    debug(json`dns:\n${records}`);
    try {
      await route53.syncRecords(records);
    } catch(err) {
      error('failed to sync Route53 records');
      error(err);
      throw err;
    }
    await proxy.reloadServices(services);
  }

})();

async function getEC2PublicIP() {
  return (await require('axios')({url: 'http://instance-data/latest/meta-data/public-ipv4'})).data;
}

function fqdn({service, stack, environment, domain}) {
  return [service, stack, environment, domain].join('.').replace(/\\.+/g, '.');
}

process.on('unhandledRejection', handleError);

function handleError(err) {
  error(err);
  process.exit(1);
}

function stringify(obj) {
  return JSON.stringify(obj, null, 4);
}
