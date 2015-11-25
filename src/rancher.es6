import axios from 'axios';
import assert from 'assert';
import {merge, omit} from 'lodash';
import $url from 'url';
import {info, debug, error} from './log';
import {json} from './helpers';

export default class RancherMetadataClient {
  constructor({address = 'http://192.168.99.100:8081', prefix = '2015-07-25'} = {}) {
    this.address = address;
    this.prefix = prefix;
  }

  async _request(options) {
    assert(options.url);

    try {
      const reqUrl = $url.resolve(this.address, options.url);
      debug(`requesting ${reqUrl}`);
      const res = await axios(merge(options, {
        url: $url.resolve(this.address, options.url),
      }));
      debug(json`returned ${reqUrl}:\n${res.data}`);
      return res.data
    }
    catch (resp) {
      throw new Error(json`RancherMetadataError: non-200 code response:\n${resp}`);
    }
  }

  async get(...path) {
    return await this._request({
      url: `/${this.prefix}/${path.join('/')}`
    });
  }
  async getJson(...path) {
    return await this._request({
      url: `/${this.prefix}/${path.join('/')}`,
      headers: {
        'Accept': 'application/json'
      },
      responseType: 'json'
    });
  }
  async getEnvironment() {
    return await this.getJson('self/stack/environment_name');
  }
  async getContainers() {
    return await this.getJson('containers');
  }

}
