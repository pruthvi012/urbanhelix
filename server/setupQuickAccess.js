const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const createQuickAccess = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Use plain text password - Mongoose pre-save hook will hash it
        const plainPassword = 'guest123';
        
        const accounts = [
            { name: 'Public Citizen', email: 'citizen@urbanhelix.com', password: plainPassword, role: 'citizen' },
            { name: 'District Engineer', email: 'engineer@urbanhelix.com', password: plainPassword, role: 'engineer' },
            { name: 'Project Contractor', email: 'contractor@urbanhelix.com', password: plainPassword, role: 'contractor' },
            { name: 'Finance Officer', email: 'finance@urbanhelix.com', password: plainPassword, role: 'financial_officer' },
            { name: 'System Admin', email: 'admin@urbanhelix.com', password: plainPassword, role: 'admin' },
        ];

        for (const acc of accounts) {
            const exists = await User.findOne({ email: acc.email });
            if (exists) {
                // Update password for existing guest accounts to ensure they are correct
                exists.password = plainPassword;
                await exists.save();
                console.log(`✅ Updated ${acc.name} (${acc.role})`);
            } else {
                await User.create(acc);
                console.log(`✅ Created ${acc.name} (${acc.role})`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Failed to create quick access accounts:', err);
        process.exit(1);
    }
};

createQuickAccess();
