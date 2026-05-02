const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
    wardNo: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    assemblyConstituency: { type: String, required: true },
    areas: [{ type: String }],
    population: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Ward', wardSchema);
