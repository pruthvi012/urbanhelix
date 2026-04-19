const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'approve', 'reject', 'login', 'verify', 'allocate', 'disburse'],
        required: true,
    },
    resourceType: {
        type: String,
        enum: ['user', 'department', 'project', 'milestone', 'fund_transaction', 'grievance'],
        required: true,
    },
    resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ user: 1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
