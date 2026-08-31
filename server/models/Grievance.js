const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null }, // Optional
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    ward: { type: String, required: true },
    wardNo: { type: Number },
    area: { type: String, required: true },
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
    },
    category: {
        type: String,
        enum: ['delay', 'quality', 'corruption', 'fund_misuse', 'safety', 'environmental', 'road_damage', 'water_issue', 'garbage', 'other'],
        default: 'other',
    },
    status: {
        type: String,
        enum: ['open', 'under_review', 'in_progress', 'resolved', 'dismissed'],
        default: 'open',
    },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resolution: {
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        resolvedAt: { type: Date, default: null },
        remarks: { type: String, default: '' },
    },
    siteVisit: {
        priority: { type: String, enum: ['moderate', 'high'], default: null },
        condition: { type: String, default: '' },
        location: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        imageUrl: { type: String, default: '' },
        visitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        visitedAt: { type: Date, default: null },
    },
    imageUrl: String,
    gpsAddress: String, // Readable address from GPS
}, { timestamps: true });

grievanceSchema.virtual('upvoteCount').get(function () {
    return this.upvotes ? this.upvotes.length : 0;
});

grievanceSchema.virtual('downvoteCount').get(function () {
    return this.downvotes ? this.downvotes.length : 0;
});

grievanceSchema.set('toJSON', { virtuals: true });
grievanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Grievance', grievanceSchema);
