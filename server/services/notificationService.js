const admin = require('firebase-admin');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Initialize Firebase Admin
// Note: This requires a serviceAccountKey.json file or environment variables
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin initialized successfully');
    } else {
        console.warn('FIREBASE_SERVICE_ACCOUNT not found in environment variables. Push notifications will be disabled.');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
}

const sendPushNotification = async (userId, title, body, data = {}) => {
    try {
        // Always create an in-app notification record
        await Notification.create({
            recipient: userId,
            title,
            message: body,
            type: data.type || 'system',
            relatedEntity: data.relatedEntity || null
        });

        // If firebase is not initialized, skip push
        if (!admin.apps.length) {
            console.log('Push notification skipped: Firebase not initialized');
            return;
        }

        const user = await User.findById(userId);
        if (!user || !user.pushTokens || user.pushTokens.length === 0) {
            console.log(`No push tokens found for user ${userId}`);
            return;
        }

        const message = {
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK', // For mobile apps
            },
            tokens: user.pushTokens,
        };

        const response = await admin.messaging().sendMulticast(message);
        
        // Handle invalid tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(user.pushTokens[idx]);
                }
            });
            
            // Remove failed tokens from user
            if (failedTokens.length > 0) {
                await User.findByIdAndUpdate(userId, {
                    $pull: { pushTokens: { $in: failedTokens } }
                });
            }
        }

        console.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failure`);
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

/**
 * Notify contractor when a project is assigned to them
 */
const notifyProjectAssignment = async (projectId, contractorId, projectName) => {
    const title = 'New Project Assigned';
    const body = `You have been assigned to the project: ${projectName}`;
    await sendPushNotification(contractorId, title, body, {
        type: 'system',
        relatedEntity: {
            entityType: 'Project',
            entityId: projectId
        }
    });
};

/**
 * Notify admin/engineer when a contractor updates progress photos
 */
const notifyPhotoUpdate = async (projectId, projectName, contractorName, recipientId) => {
    const title = 'Progress Photo Update';
    const body = `${contractorName} updated progress photos for project: ${projectName}`;
    await sendPushNotification(recipientId, title, body, {
        type: 'system',
        relatedEntity: {
            entityType: 'Project',
            entityId: projectId
        }
    });
};

/**
 * Notify engineer when a project is assigned to them
 */
const notifyEngineerAssignment = async (projectId, engineerId, projectName) => {
    const title = 'New Project Assignment';
    const body = `You have been assigned as the lead engineer for project: ${projectName}`;
    await sendPushNotification(engineerId, title, body, {
        type: 'system',
        relatedEntity: {
            entityType: 'Project',
            entityId: projectId
        }
    });
};

/**
 * Notify all admins about important project events
 */
const notifyAdmins = async (title, body, data = {}) => {
    try {
        const admins = await User.find({ role: 'admin' });
        for (const adminUser of admins) {
            await sendPushNotification(adminUser._id, title, body, data);
        }
    } catch (error) {
        console.error('Error notifying admins:', error);
    }
};

/**
 * Notify admins and department heads when a new project is proposed
 */
const notifyProjectProposal = async (project) => {
    const title = 'New Project Proposal';
    const body = `A new project "${project.title}" has been proposed for ${project.location?.area || 'your ward'}.`;
    
    // Notify all admins
    await notifyAdmins(title, body, {
        type: 'project_proposed',
        relatedEntity: {
            entityType: 'Project',
            entityId: project._id
        }
    });
};

/**
 * Notify relevant parties about budget revisions or edits
 */
const notifyBudgetChange = async (projectId, projectName, oldBudget, newBudget, recipientId, isRevision = true) => {
    const type = isRevision ? 'Budget Revised' : 'Budget Updated';
    const title = `Project ${type}`;
    const body = `The budget for "${projectName}" has changed from ₹${oldBudget.toLocaleString()} to ₹${newBudget.toLocaleString()}.`;
    
    await sendPushNotification(recipientId, title, body, {
        type: 'budget_change',
        relatedEntity: {
            entityType: 'Project',
            entityId: projectId
        }
    });
};

/**
 * Notify engineers when a contractor submits a milestone
 */
const notifyMilestoneSubmission = async (milestone, projectName, engineerId) => {
    const title = 'New Milestone Submitted';
    const body = `Contractor has submitted Milestone #${milestone.milestoneNumber} for project: ${projectName}`;
    
    await sendPushNotification(engineerId, title, body, {
        type: 'milestone_submitted',
        relatedEntity: {
            entityType: 'Project',
            entityId: milestone.project
        }
    });
};

/**
 * Notify contractor when a milestone is approved or rejected
 */
const notifyMilestoneUpdate = async (milestone, projectName, status) => {
    const title = `Milestone ${status === 'approved' ? 'Approved' : 'Rejected'}`;
    const body = `Your milestone #${milestone.milestoneNumber} for "${projectName}" has been ${status}.`;
    
    await sendPushNotification(milestone.submittedBy, title, body, {
        type: 'milestone_update',
        relatedEntity: {
            entityType: 'Project',
            entityId: milestone.project
        }
    });
};

/**
 * Notify all stakeholders of a project (Proposer, Engineer, Contractor, and Admins)
 */
const notifyProjectStakeholders = async (project, title, body, type = 'system') => {
    const recipients = new Set();
    
    // Add Proposer
    if (project.proposedBy) recipients.add(project.proposedBy.toString());
    
    // Add Engineer
    if (project.engineer) recipients.add(project.engineer.toString());
    
    // Add Contractor
    if (project.contractor) recipients.add(project.contractor.toString());
    
    // Send to specific stakeholders
    for (const userId of recipients) {
        await sendPushNotification(userId, title, body, {
            type: type,
            relatedEntity: {
                entityType: 'Project',
                entityId: project._id
            }
        });
    }
    
    // Also notify all admins
    await notifyAdmins(title, body, {
        type: type,
        relatedEntity: {
            entityType: 'Project',
            entityId: project._id
        }
    });
};

/**
 * Notify user when their grievance is resolved
 */
const notifyGrievanceResolution = async (grievance, status) => {
    const title = `Grievance ${status === 'resolved' ? 'Resolved' : 'Updated'}`;
    const body = `Your grievance regarding "${grievance.title}" has been marked as ${status}.`;
    
    await sendPushNotification(grievance.citizen, title, body, {
        type: 'grievance_update',
        relatedEntity: {
            entityType: 'Grievance',
            entityId: grievance._id
        }
    });
};

module.exports = {
    sendPushNotification,
    notifyProjectAssignment,
    notifyEngineerAssignment,
    notifyPhotoUpdate,
    notifyAdmins,
    notifyProjectProposal,
    notifyBudgetChange,
    notifyMilestoneSubmission,
    notifyMilestoneUpdate,
    notifyGrievanceResolution,
    notifyProjectStakeholders
};
