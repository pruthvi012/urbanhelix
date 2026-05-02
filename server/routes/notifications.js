const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — get user notifications
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [
                { recipient: req.user._id },
                { recipient: null } // broadcast
            ]
        })
        .sort({ createdAt: -1 })
        .limit(20);

        res.json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/notifications/subscribe — save push token
router.post('/subscribe', protect, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { pushTokens: token }
        });

        res.json({ success: true, message: 'Subscribed to push notifications' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/notifications/:id/read — mark as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );
        res.json({ success: true, notification });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
