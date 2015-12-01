import {promisifyAll} from 'bluebird';
import {Route53} from 'aws-sdk';
import {pairs, assign, find, pluck, isEqual} from 'lodash';
import {json} from './helpers';
import {info, debug, error} from './log';
export default class Route53Client {
  constructor({hostZoneId, ttl, aws}) {
    this._hostZoneId = hostZoneId;
    this._client = promisifyAll(new Route53(aws));
    this._ttl = ttl || 300;
  }

  async getDomain() {
    return (await this._client.getHostedZoneAsync({Id: this._hostZoneId})).HostedZone.Name;
  }

  async getRecords() {
    const res = await this._client.listResourceRecordSetsAsync({
      HostedZoneId: this._hostZoneId
    });

    const recordsA = res.ResourceRecordSets.filter(({Type})=>Type == 'A');
    info(json`received records from Route53:\n${recordsA}`);
    return recordsA;
  }

  async syncRecords(rancherRecords) {
    this.serverRecords = this.serverRecords || await this.getRecords();
    let changedRecords = [];
    let addRecords = [];
    let removeRecords = [];
    for (let [name, ips] of pairs(rancherRecords)) {
      let rec;
      if (rec = find(this.serverRecords, {Name: name})) {
        if (!isEqual(pluck(rec.ResourceRecords, 'Value'), ips)) {
          info(json`${pluck(rec.ResourceRecords, 'Value')} not equals ${ips}`);
          changedRecords.push({
            Name: name,
            Type: 'A',
            TTL: this._ttl,
            ResourceRecords: ips.map((ip) => ({
              Value: ip
            }))
          })
        }
      } else {
        addRecords.push({
          Name: name,
          Type: 'A',
          TTL: this._ttl,
          ResourceRecords: ips.map((ip) => ({
            Value: ip
          }))
        });
      }
    }
    if (addRecords.length) {
      info(json`these records will be added:\n${pluck(addRecords, 'Name')}`)
    }
    if (changedRecords.length) {
      info(json`these records will be changed:\n${pluck(changedRecords, 'Name')}`)
    }

    const request = {
      HostedZoneId: this._hostZoneId,
      ChangeBatch: {
        Changes: []
      }
    };

    for (let rec of addRecords.concat(changedRecords)) {
      request.ChangeBatch.Changes.push({
        Action: 'UPSERT',
        ResourceRecordSet: rec
      });
    }

    if (request.ChangeBatch.Changes.length) {
      debug(json`sending request to Route53:\n${request}`);
      const res = await this._client.changeResourceRecordSetsAsync(request);
      this.serverRecords = this.serverRecords.concat(addRecords);
      for (let changedRecord of changedRecords) {
        let rec = find(this.serverRecords, {Name: changedRecord.Name});
        assign(rec, changedRecord);
      }
      debug(json`response from Route53:\n${res}`);
    } else {
      debug(`no changes for Route53`);
    }
  }

}
