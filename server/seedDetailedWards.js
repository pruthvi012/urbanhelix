const mongoose = require('mongoose');
const Ward = require('./models/Ward');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const wardsData = [
    // Vijayanagar AC (167)
    { wardNo: 156, name: 'Kempapura Agrahara', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['RPC Layout', 'Binny Layout', 'Hosahalli Main Road'] },
    { wardNo: 157, name: 'Vijayanagar', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['1st Stage', '2nd Stage', 'MC Layout', 'Maruti Mandir'] },
    { wardNo: 158, name: 'Hosahalli', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['Hosahalli', 'Pipeline Road', 'MC Layout'] },
    { wardNo: 159, name: 'Hampi Nagar', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['RPC Layout', 'Attiguppe', 'Hampi Nagar 1st Stage'] },
    { wardNo: 160, name: 'Bapuji Nagar', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['New Guddadahalli', 'Bapuji Nagar'] },
    { wardNo: 161, name: 'Attiguppe', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['Attiguppe', 'Binny Layout'] },
    { wardNo: 162, name: 'Gali Anjenaya Temple Ward', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['Mysore Road', 'Gali Anjaneya Temple area'] },
    { wardNo: 163, name: 'Veerabhadranagar', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['Veerabhadranagar', 'Girinagar 4th Phase'] },
    { wardNo: 164, name: 'Avalahalli', assemblyConstituency: 'Vijayanagar AC (167)', areas: ['Avalahalli', 'Muneshwara Block'] },

    // Chickpet AC (169)
    { wardNo: 171, name: 'Sudham Nagara', assemblyConstituency: 'Chickpet AC (169)', areas: ['Sudham Nagar', 'Wilson Garden'] },
    { wardNo: 172, name: 'Dharmaraya Swamy Temple Ward', assemblyConstituency: 'Chickpet AC (169)', areas: ['OTC Road', 'Nagarthpet', 'Chickpet'] },
    { wardNo: 173, name: 'Sunkenahalli', assemblyConstituency: 'Chickpet AC (169)', areas: ['Sunkenahalli', 'Gavipuram'] },
    { wardNo: 174, name: 'Vishveshwara Puram', assemblyConstituency: 'Chickpet AC (169)', areas: ['V V Puram', 'Sajjan Rao Circle'] },
    { wardNo: 175, name: 'Ashoka Pillar', assemblyConstituency: 'Chickpet AC (169)', areas: ['Ashoka Pillar area', 'Jayanagar 1st Block'] },
    { wardNo: 176, name: 'Someshwara Nagar', assemblyConstituency: 'Chickpet AC (169)', areas: ['Someshwara Nagar', 'NIMHANS area'] },
    { wardNo: 177, name: 'Hombegowda Nagara', assemblyConstituency: 'Chickpet AC (169)', areas: ['Hombegowda Nagar', 'Wilson Garden'] },

    // BTM Layout AC (172)
    { wardNo: 185, name: 'Ejipura', assemblyConstituency: 'BTM Layout AC (172)', areas: ['Ejipura', 'Viveknagar'] },
    { wardNo: 186, name: 'Koramangala', assemblyConstituency: 'BTM Layout AC (172)', areas: ['1st Block', '3rd Block', '4th Block', '5th Block', '6th Block', '7th Block', '8th Block'] },
    { wardNo: 187, name: 'Adugodi', assemblyConstituency: 'BTM Layout AC (172)', areas: ['Adugodi', 'Lakkasandra (part)'] },
    { wardNo: 188, name: 'Lakkasandra', assemblyConstituency: 'BTM Layout AC (172)', areas: ['Lakkasandra', 'Wilson Garden (part)'] },
    { wardNo: 189, name: 'Suddagunte Palya', assemblyConstituency: 'BTM Layout AC (172)', areas: ['S G Palya', 'Tavarekere'] },
    { wardNo: 190, name: 'Madivala', assemblyConstituency: 'BTM Layout AC (172)', areas: ['Madivala', 'Maruti Nagar'] },
    { wardNo: 191, name: 'Jakkasandra', assemblyConstituency: 'BTM Layout AC (172)', areas: ['Jakkasandra', 'Agara (part)'] },
    { wardNo: 192, name: 'BTM Layout', assemblyConstituency: 'BTM Layout AC (172)', areas: ['1st Stage', '2nd Stage'] },
    { wardNo: 193, name: 'N S Palya', assemblyConstituency: 'BTM Layout AC (172)', areas: ['N S Palya', 'Bilekahalli (part)'] },

    // Jayanagar AC (173)
    { wardNo: 194, name: 'Gurappanapalya', assemblyConstituency: 'Jayanagar AC (173)', areas: ['BTM 1st Stage', 'Gurappanapalya'] },
    { wardNo: 195, name: 'Tilak Nagar', assemblyConstituency: 'Jayanagar AC (173)', areas: ['Tilak Nagar', 'Jayanagar 4th T Block'] },
    { wardNo: 196, name: 'Byrasandra', assemblyConstituency: 'Jayanagar AC (173)', areas: ['Byrasandra', 'Jayanagar 1st Block (part)'] },
    { wardNo: 197, name: 'Shakambari Nagar', assemblyConstituency: 'Jayanagar AC (173)', areas: ['J P Nagar 1st Phase', 'Sarakki (part)'] },
    { wardNo: 198, name: 'J P Nagar', assemblyConstituency: 'Jayanagar AC (173)', areas: ['2nd Phase', '3rd Phase', '6th Phase'] },
    { wardNo: 199, name: 'Sarakki', assemblyConstituency: 'Jayanagar AC (173)', areas: ['Sarakki', 'J P Nagar 1st Phase (part)'] },

    // Padmanaba Nagar AC (171)
    { wardNo: 200, name: 'Yediyur', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Yediyur', 'Jayanagar 6th Block'] },
    { wardNo: 201, name: 'Umamaheshwari Ward', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Chikkallasandra', 'Ittamadu'] },
    { wardNo: 202, name: 'Ganesh Mandir Ward', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Hosakerehalli (part)', 'Banashankari 3rd Stage'] },
    { wardNo: 203, name: 'Banashankari Temple Ward', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['BSK 2nd Stage'] },
    { wardNo: 204, name: 'Kumaraswamy Layout', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['1st Stage', '2nd Stage'] },
    { wardNo: 205, name: 'Vikram Nagar', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['ISRO Layout', 'Kumaraswamy Layout (part)'] },
    { wardNo: 206, name: 'Padmanabha Nagar', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Padmanabha Nagar', 'Chennammana Kere'] },
    { wardNo: 207, name: 'Kamakya Nagar', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Kamakya', 'Banashankari 3rd Stage'] },
    { wardNo: 208, name: 'Deen Dayalu Ward', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Tyagaraja Nagar', 'Basavanagudi (part)'] },
    { wardNo: 209, name: 'Hosakerehalli', assemblyConstituency: 'Padmanaba Nagar AC (171)', areas: ['Hosakerehalli', 'Ittamadu'] },

    // Basavanagudi AC (170)
    { wardNo: 210, name: 'Basavanagudi', assemblyConstituency: 'Basavanagudi AC (170)', areas: ['DVG Road', 'Gandhi Bazaar'] },
    { wardNo: 211, name: 'Hanumanth Nagar', assemblyConstituency: 'Basavanagudi AC (170)', areas: ['Hanumanth Nagar', 'Gavipuram'] },
    { wardNo: 212, name: 'Srinivasa Nagar', assemblyConstituency: 'Basavanagudi AC (170)', areas: ['Srinivasa Nagar', 'Banashankari 1st Stage'] },
    { wardNo: 213, name: 'Srinagar', assemblyConstituency: 'Basavanagudi AC (170)', areas: ['Srinagar', 'Banashankari 1st Stage'] },
    { wardNo: 214, name: 'Girinagar', assemblyConstituency: 'Basavanagudi AC (170)', areas: ['1st Phase', '2nd Phase', '3rd Phase'] },
    { wardNo: 215, name: 'Katriguppe', assemblyConstituency: 'Basavanagudi AC (170)', areas: ['Katriguppe', 'BSK 3rd Stage'] },
    { wardNo: 216, name: 'Vidyapeeta Ward', assemblyConstituency: 'Basavanagudi AC (170)', areas: ['Vidyapeetha', 'Chennammana Kere'] }
];

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        await Ward.deleteMany({});
        await Ward.insertMany(wardsData);
        
        console.log('✅ Wards and Areas seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
