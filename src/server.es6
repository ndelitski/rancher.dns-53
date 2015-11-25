import RancherClient from './rancher';
import resolveConfig from './config';
import _, {pluck} from 'lodash';
import {info, debug, error} from './log';
import Promise, {all, delay} from 'bluebird';
import assert from 'assert';
import Route53 from './route53';

(async () => {
  const config = await resolveConfig();
  info(`started with config:\n${stringify(config)}`);
  assert(config.interval, '`interval` is missing');
  assert(config.hostZoneId, '`hostZoneId` is missing');
  assert(config.aws, '`aws` is missing');
  assert(config.aws.accessKey, '`aws.accessKey` is missing');
  assert(config.aws.secretKey, '`aws.secretKey` is missing');

  const route53 = new Route53({hostZoneId: config.hostZoneId, aws: config.aws});
  const domain = await route53.getDomain();
  const rancher = new RancherClient(config.rancher);
  const environment = await rancher.getEnvironment();

  while(true) {
    await tick();
    await delay(config.interval);
  }

  async function tick() {
    debug('tick');

    const containers = await rancher.getContainers();
    for (let container of containers) {
      if (container.service_name && container.stack_name && container.labels['io.rancher.route53'] == 'true') {
        info(fqdn({
          service: container.service_name,
          stack: container.stack_name,
          environment,
          domain
        }));
      }
    }
  }


})();

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
