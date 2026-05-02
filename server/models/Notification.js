const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null means for all or broadcast
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['budget_revision', 'project_approved', 'milestone_completed', 'fraud_alert', 'system', 'project_proposed', 'budget_change', 'milestone_submitted', 'milestone_update', 'grievance_update'],
        default: 'system'
    },
    relatedEntity: {
        entityType: { type: String },
        entityId: { type: mongoose.Schema.Types.ObjectId }
    },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
