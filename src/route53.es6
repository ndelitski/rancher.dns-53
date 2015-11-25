import {promisifyAll} from 'bluebird';
import {Route53} from 'aws-sdk';

export default class Route53Client {
  constructor({hostZoneId, aws}) {
    this._hostZoneId = hostZoneId;
    this._client = promisifyAll(new Route53(aws));
  }
  async getDomain() {
    return (await this._client.getHostedZoneAsync({Id: this._hostZoneId})).HostedZone.Name;
  }
}
