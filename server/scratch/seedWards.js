const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Ward = require('../models/Ward');
const Department = require('../models/Department');

const SOUTH_ZONE_WARDS = [
    { wardNo: 156, name: 'Kempapura Agrahara', assemblyConstituency: 'Vijayanagar', areas: ['RPC Layout', 'Binny Layout', 'Hosahalli Main Road'] },
    { wardNo: 157, name: 'Vijayanagar', assemblyConstituency: 'Vijayanagar', areas: ['1st Stage', '2nd Stage', 'MC Layout', 'Maruti Mandir'] },
    { wardNo: 158, name: 'Hosahalli', assemblyConstituency: 'Vijayanagar', areas: ['Hosahalli', 'Pipeline Road', 'MC Layout'] },
    { wardNo: 159, name: 'Hampi Nagar', assemblyConstituency: 'Vijayanagar', areas: ['RPC Layout', 'Attiguppe', 'Hampi Nagar 1st Stage'] },
    { wardNo: 160, name: 'Bapuji Nagar', assemblyConstituency: 'Vijayanagar', areas: ['New Guddadahalli', 'Bapuji Nagar'] },
    { wardNo: 161, name: 'Attiguppe', assemblyConstituency: 'Vijayanagar', areas: ['Attiguppe', 'Binny Layout'] },
    { wardNo: 162, name: 'Gali Anjenaya Temple Ward', assemblyConstituency: 'Vijayanagar', areas: ['Mysore Road', 'Gali Anjaneya Temple area'] },
    { wardNo: 163, name: 'Veerabhadranagar', assemblyConstituency: 'Vijayanagar', areas: ['Veerabhadranagar', 'Girinagar 4th Phase'] },
    { wardNo: 164, name: 'Avalahalli', assemblyConstituency: 'Vijayanagar', areas: ['Avalahalli', 'Muneshwara Block'] },
    { wardNo: 165, name: 'Sudham Nagara', assemblyConstituency: 'Chickpet', areas: ['Sudham Nagar', 'Wilson Garden'] },
    { wardNo: 166, name: 'Dharmaraya Swamy Temple Ward', assemblyConstituency: 'Chickpet', areas: ['OTC Road', 'Nagarthpet', 'Chickpet'] },
    { wardNo: 167, name: 'Sunkenahalli', assemblyConstituency: 'Chickpet', areas: ['Sunkenahalli', 'Gavipuram'] },
    { wardNo: 168, name: 'Vishveshwara Puram', assemblyConstituency: 'Chickpet', areas: ['V V Puram', 'Sajjan Rao Circle'] },
    { wardNo: 169, name: 'Ashoka Pillar', assemblyConstituency: 'Jayanagar', areas: ['Ashoka Pillar area', 'Jayanagar 1st Block'] },
    { wardNo: 170, name: 'Someshwara Nagar', assemblyConstituency: 'Jayanagar', areas: ['Someshwara Nagar', 'NIMHANS area'] },
    { wardNo: 171, name: 'Hombegowda Nagara', assemblyConstituency: 'Jayanagar', areas: ['Hombegowda Nagar', 'Wilson Garden'] },
    { wardNo: 172, name: 'Ejipura', assemblyConstituency: 'BTM Layout', areas: ['Ejipura', 'Viveknagar'] },
    { wardNo: 173, name: 'Koramangala', assemblyConstituency: 'BTM Layout', areas: ['1st Block', '3rd Block', '4th Block', '5th Block', '6th Block', '7th Block', '8th Block'] },
    { wardNo: 174, name: 'Adugodi', assemblyConstituency: 'BTM Layout', areas: ['Adugodi', 'Lakkasandra (part)'] },
    { wardNo: 175, name: 'Lakkasandra', assemblyConstituency: 'BTM Layout', areas: ['Lakkasandra', 'Wilson Garden (part)'] },
    { wardNo: 176, name: 'Suddagunte Palya', assemblyConstituency: 'BTM Layout', areas: ['S G Palya', 'Tavarekere'] },
    { wardNo: 177, name: 'Madivala', assemblyConstituency: 'BTM Layout', areas: ['Madivala', 'Maruti Nagar'] },
    { wardNo: 178, name: 'Jakkasandra', assemblyConstituency: 'BTM Layout', areas: ['Jakkasandra', 'Agara (part)'] },
    { wardNo: 179, name: 'BTM Layout', assemblyConstituency: 'BTM Layout', areas: ['1st Stage', '2nd Stage'] },
    { wardNo: 180, name: 'N S Palya', assemblyConstituency: 'BTM Layout', areas: ['N S Palya', 'Bilekahalli (part)'] },
    { wardNo: 181, name: 'Gurappanapalya', assemblyConstituency: 'BTM Layout', areas: ['BTM 1st Stage', 'Gurappanapalya'] },
    { wardNo: 182, name: 'Tilak Nagar', assemblyConstituency: 'Jayanagar', areas: ['Tilak Nagar', 'Jayanagar 4th T Block'] },
    { wardNo: 183, name: 'Byrasandra', assemblyConstituency: 'Jayanagar', areas: ['Byrasandra', 'Jayanagar 1st Block (part)'] },
    { wardNo: 184, name: 'Shakambari Nagar', assemblyConstituency: 'Jayanagar', areas: ['J P Nagar 1st Phase', 'Sarakki (part)'] },
    { wardNo: 185, name: 'J P Nagar', assemblyConstituency: 'Jayanagar', areas: ['2nd Phase', '3rd Phase', '6th Phase'] },
    { wardNo: 186, name: 'Sarakki', assemblyConstituency: 'Jayanagar', areas: ['Sarakki', 'J P Nagar 1st Phase (part)'] },
    { wardNo: 187, name: 'Yediyur', assemblyConstituency: 'Padmanabha Nagar', areas: ['Yediyur', 'Jayanagar 6th Block'] },
    { wardNo: 188, name: 'Umamaheshwari Ward', assemblyConstituency: 'Padmanabha Nagar', areas: ['Chikkallasandra', 'Ittamadu'] },
    { wardNo: 189, name: 'Ganesh Mandir Ward', assemblyConstituency: 'Padmanabha Nagar', areas: ['Hosakerehalli (part)', 'Banashankari 3rd Stage'] },
    { wardNo: 190, name: 'Banashankari Temple Ward', assemblyConstituency: 'Padmanabha Nagar', areas: ['BSK 2nd Stage'] },
    { wardNo: 191, name: 'Kumaraswamy Layout', assemblyConstituency: 'Padmanabha Nagar', areas: ['1st Stage', '2nd Stage'] },
    { wardNo: 192, name: 'Vikram Nagar', assemblyConstituency: 'Padmanabha Nagar', areas: ['ISRO Layout', 'Kumaraswamy Layout (part)'] },
    { wardNo: 193, name: 'Padmanabha Nagar', assemblyConstituency: 'Padmanabha Nagar', areas: ['Padmanabha Nagar', 'Chennammana Kere'] },
    { wardNo: 194, name: 'Kamakya Nagar', assemblyConstituency: 'Padmanabha Nagar', areas: ['Kamakya', 'Banashankari 3rd Stage'] },
    { wardNo: 195, name: 'Deen Dayalu Ward', assemblyConstituency: 'Padmanabha Nagar', areas: ['Tyagaraja Nagar', 'Basavanagudi (part)'] },
    { wardNo: 196, name: 'Hosakerehalli', assemblyConstituency: 'Padmanabha Nagar', areas: ['Hosakerehalli', 'Ittamadu'] },
    { wardNo: 197, name: 'Basavanagudi', assemblyConstituency: 'Basavanagudi', areas: ['DVG Road', 'Gandhi Bazaar'] },
    { wardNo: 198, name: 'Hanumanth Nagar', assemblyConstituency: 'Basavanagudi', areas: ['Hanumanth Nagar', 'Gavipuram'] },
    { wardNo: 199, name: 'Srinivasa Nagar', assemblyConstituency: 'Basavanagudi', areas: ['Srinivasa Nagar', 'Banashankari 1st Stage'] },
    { wardNo: 200, name: 'Srinagar', assemblyConstituency: 'Basavanagudi', areas: ['Srinagar', 'Banashankari 1st Stage'] },
    { wardNo: 201, name: 'Girinagar', assemblyConstituency: 'Basavanagudi', areas: ['1st Phase', '2nd Phase', '3rd Phase'] },
    { wardNo: 202, name: 'Katriguppe', assemblyConstituency: 'Basavanagudi', areas: ['Katriguppe', 'BSK 3rd Stage'] },
    { wardNo: 203, name: 'Vidyapeeta Ward', assemblyConstituency: 'Basavanagudi', areas: ['Vidyapeetha', 'Chennammana Kere'] }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🌱 Seeding Ward and Department master data...');

        // 1. Clear existing wards to avoid duplicates
        await Ward.deleteMany({});
        
        // 2. Insert new wards
        await Ward.insertMany(SOUTH_ZONE_WARDS);
        console.log(`✅ ${SOUTH_ZONE_WARDS.length} Wards seeded successfully.`);

        // 3. Ensure Departments exist for these wards
        for (const w of SOUTH_ZONE_WARDS) {
            await Department.findOneAndUpdate(
                { name: w.name },
                { 
                    name: w.name, 
                    code: `W${w.wardNo}`,
                    totalBudget: 50000000, // 5 Cr default budget
                    allocatedBudget: 0,
                    spentBudget: 0
                },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Department records synchronized.');

        console.log('\n✨ MASTER DATA RESTORED! Your lists will now appear correctly.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during seeding:', err);
        process.exit(1);
    }
}

seed();
