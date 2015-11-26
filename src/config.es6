import path from 'path';
import fs from 'fs';
import {promisify} from 'bluebird';
import {info} from './log';
import axios from 'axios';

const readFile = promisify(fs.readFile);
const {CONFIG_FILE} = process.env;
const DEFAULT_CONFIG_FILE = path.join(__dirname, '../config.json');

export default async function resolveConfig() {
  if (CONFIG_FILE) {
    info(`reading config from file ${CONFIG_FILE}`);
    return await fileSource(CONFIG_FILE);
  } else if (fs.existsSync(DEFAULT_CONFIG_FILE)) {
    info(`reading config from file ${DEFAULT_CONFIG_FILE}`);
    return await fileSource(DEFAULT_CONFIG_FILE);
  } else {
    info('trying to compose config from env variables');
    return await envSource();
  }
}

async function fileSource(filePath) {
  const contents = await readFile(filePath, 'utf8');
  return JSON.parse(contents);
}

async function envSource() {
  const {
    DNS_INTERVAL,
    DNS_HOSTZONE,
    RANCHER_METADATA_ADDRESS,
    RANCHER_METADATA_PREFIX,
    AWS_ACCESS_KEY,
    AWS_SECRET_KEY,
  } = process.env;

  return {
    hostZoneId: DNS_HOSTZONE,
    interval: DNS_INTERVAL || 10000,
    rancherMetadata: {
      address: RANCHER_METADATA_ADDRESS,
      prefix: RANCHER_METADATA_PREFIX
    },
    aws: {
      accessKey: AWS_ACCESS_KEY,
      secretKey: AWS_SECRET_KEY
    }
  }
}
