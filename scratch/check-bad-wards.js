const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/urbanhelix').then(() => {
    return mongoose.connection.db.collection('wards').find({ 
        $or: [ 
            { name: { $exists: false } }, 
            { name: null }, 
            { assemblyConstituency: { $exists: false } }, 
            { assemblyConstituency: null } 
        ] 
    }).toArray();
}).then(w => { 
    console.log('Bad Wards:', w.length); 
    process.exit(0); 
});
