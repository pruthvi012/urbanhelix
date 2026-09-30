require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');
const Project = require('./server/models/Project');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const projects = await Project.find({ "expenditures.txHash": { $exists: true, $ne: null } });
  
  let found = 0;
  projects.forEach(p => {
    p.expenditures.forEach(e => {
      if(e.txHash) {
        console.log(`✅ Found txHash! Project: ${p.projectCode}, Vendor: ${e.vendor}, txHash: ${e.txHash}`);
        found++;
      }
    });
  });
  
  if (found === 0) console.log("No transactions with txHash found yet. (Queue might take up to 5 minutes to sweep)");
  process.exit(0);
}
check().catch(console.error);
