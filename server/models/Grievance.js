const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: ['delay', 'quality', 'corruption', 'fund_misuse', 'safety', 'environmental', 'other'],
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
    imageUrl: String,
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
