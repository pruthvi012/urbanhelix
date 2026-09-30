const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/urbanhelix').then(async () => {
    const db = mongoose.connection.db;
    const p = await db.collection('projects').findOne({});
    if (p) {
        await db.collection('projects').updateOne({ _id: p._id }, { $set: { status: 'completed', contractorCompletionPhotoUrl: 'https://images.unsplash.com/photo-1541888081695-dd7f66a203f5?w=800' } });
        console.log('Updated ' + p.title + ' to completed');
    }
    process.exit(0);
}).catch(console.error);
