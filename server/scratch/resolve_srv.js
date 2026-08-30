const dns = require('dns');
const { Resolver } = dns.promises;
const resolver = new Resolver();
resolver.setServers(['8.8.8.8']);

async function getDirectUri() {
  try {
    const srvRecords = await resolver.resolveSrv('_mongodb._tcp.urbanhelix.zryrvkm.mongodb.net');
    const txtRecords = await resolver.resolveTxt('urbanhelix.zryrvkm.mongodb.net');
    
    const hosts = srvRecords.map(record => `${record.name}:${record.port}`).join(',');
    let options = '';
    if (txtRecords && txtRecords.length > 0) {
      options = txtRecords[0].join('');
    }
    
    const uri = `mongodb://${process.env.DB_USER || 'Pruthvish'}:${process.env.DB_PASS || 'pruthvishgowda'}@${hosts}/urbanhelix?${options}`;
    console.log(uri);
  } catch (err) {
    console.error(err);
  }
}
getDirectUri();
