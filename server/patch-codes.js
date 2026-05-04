const mongoose = require('mongoose');
const Project = require('./models/Project');
const crypto = require('crypto');

mongoose.connect('mongodb+srv://Pruthvish:pruthvishgowda@cluster0.3vhcidv.mongodb.net/urbanhelix?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    console.log('Connected to DB');
    const projects = await Project.find({ status: 'approved' });
    console.log('Total approved projects:', projects.length);
    for (let p of projects) {
        if (!p.projectCode) {
            let isUnique = false;
            let code;
            while (!isUnique) {
                code = 'UHX-' + crypto.randomBytes(3).toString('hex').toUpperCase();
                const existing = await Project.findOne({ projectCode: code });
                if (!existing) isUnique = true;
            }
            p.projectCode = code;
            await p.save();
            console.log('Generated code for ' + p.title + ' -> ' + code);
        } else {
            console.log('Project ' + p.title + ' already has code -> ' + p.projectCode);
        }
    }
    
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
