const mongoose = require('mongoose');
const Department = require('./models/Department');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const wardNames = [
    // Vijayanagar AC (167)
    { no: 156, name: 'Kempapura Agrahara', dept: 'Roads & Infra' },
    { no: 157, name: 'Vijayanagar', dept: 'Water Supply' },
    { no: 158, name: 'Hosahalli', dept: 'Sanitation' },
    { no: 159, name: 'Hampi Nagar', dept: 'Parks' },
    { no: 160, name: 'Bapuji Nagar', dept: 'Public Works' },
    { no: 161, name: 'Attiguppe', dept: 'Electricity' },
    { no: 162, name: 'Gali Anjenaya Temple Ward', dept: 'Roads & Infra' },
    { no: 163, name: 'Veerabhadranagar', dept: 'Water Supply' },
    { no: 164, name: 'Avalahalli', dept: 'Sanitation' },

    // Chickpet AC (169)
    { no: 171, name: 'Sudham Nagara', dept: 'Public Works' },
    { no: 172, name: 'Dharmaraya Swamy Temple Ward', dept: 'Sanitation' },
    { no: 173, name: 'Sunkenahalli', dept: 'Roads & Infra' },
    { no: 174, name: 'Vishveshwara Puram', dept: 'Water Supply' },
    { no: 175, name: 'Ashoka Pillar', dept: 'Public Works' },
    { no: 176, name: 'Someshwara Nagar', dept: 'Electricity' },
    { no: 177, name: 'Hombegowda Nagara', dept: 'Sanitation' },

    // BTM Layout AC (172)
    { no: 185, name: 'Ejipura', dept: 'Roads & Infra' },
    { no: 186, name: 'Koramangala', dept: 'Parks' },
    { no: 187, name: 'Adugodi', dept: 'Sanitation' },
    { no: 188, name: 'Lakkasandra', dept: 'Water Supply' },
    { no: 189, name: 'Suddagunte Palya', dept: 'Electricity' },
    { no: 190, name: 'Madivala', dept: 'Public Works' },
    { no: 191, name: 'Jakkasandra', dept: 'Parks' },
    { no: 192, name: 'BTM Layout', dept: 'Roads & Infra' },
    { no: 193, name: 'N S Palya', dept: 'Water Supply' },

    // Jayanagar AC (173)
    { no: 194, name: 'Gurappanapalya', dept: 'Sanitation' },
    { no: 195, name: 'Tilak Nagar', dept: 'Public Works' },
    { no: 196, name: 'Byrasandra', dept: 'Roads & Infra' },
    { no: 197, name: 'Shakambari Nagar', dept: 'Parks' },
    { no: 198, name: 'J P Nagar', dept: 'Public Works' },
    { no: 199, name: 'Sarakki', dept: 'Water Supply' },

    // Padmanaba Nagar AC (171)
    { no: 200, name: 'Yediyur', dept: 'Roads & Infra' },
    { no: 201, name: 'Umamaheshwari Ward', dept: 'Sanitation' },
    { no: 202, name: 'Ganesh Mandir Ward', dept: 'Parks' },
    { no: 203, name: 'Banashankari Temple Ward', dept: 'Water Supply' },
    { no: 204, name: 'Kumaraswamy Layout', dept: 'Public Works' },
    { no: 205, name: 'Vikram Nagar', dept: 'Electricity' },
    { no: 206, name: 'Padmanabha Nagar', dept: 'Roads & Infra' },
    { no: 207, name: 'Kamakya Nagar', dept: 'Sanitation' },
    { no: 208, name: 'Deen Dayalu Ward', dept: 'Parks' },
    { no: 209, name: 'Hosakerehalli', dept: 'Water Supply' },

    // Basavanagudi AC (170)
    { no: 210, name: 'Basavanagudi', dept: 'Public Works' },
    { no: 211, name: 'Hanumanth Nagar', dept: 'Roads & Infra' },
    { no: 212, name: 'Srinivasa Nagar', dept: 'Sanitation' },
    { no: 213, name: 'Srinagar', dept: 'Parks' },
    { no: 214, name: 'Girinagar', dept: 'Water Supply' },
    { no: 215, name: 'Katriguppe', dept: 'Public Works' },
    { no: 216, name: 'Vidyapeeta Ward', dept: 'Electricity' }
];

const wards = wardNames.map(w => {
    const total = Math.floor(Math.random() * 20000000) + 10000000;
    const allocated = Math.floor(total * 0.8);
    const spent = Math.floor(allocated * (Math.random() * 0.5 + 0.4));
    
    return {
        name: `${w.dept} - ${w.name}`, // Unique name
        ward: w.name,
        wardNo: w.no,
        totalBudget: total,
        allocatedBudget: allocated,
        spentBudget: spent,
        fiscalYear: '2025-2026'
    };
});

const seed = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Remove existing departments
        await Department.deleteMany({});
        
        await Department.insertMany(wards);
        console.log(`✅ ${wards.length} South Zone Wards Seeded Successfully`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
