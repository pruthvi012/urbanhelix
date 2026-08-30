require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
  const projects = await Project.find({});
  const p = projects.find(proj => {
    return proj._id.toString().toUpperCase().includes('573E86') || 
           (proj.projectCode && proj.projectCode.toUpperCase().includes('573E86'));
  });
  if (p) {
    console.log(JSON.stringify(p, null, 2));
  } else {
    console.log('Project not found in Atlas');
  }
  process.exit();
}

run();
