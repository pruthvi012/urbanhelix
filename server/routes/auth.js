const express = require('express');
const jwt = require('jsonwebtoken');
const https = require('https');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, phone, walletAddress } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const user = await User.create({ name, email, password, role, phone, walletAddress });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            token,
            user: user.toJSON(),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Create audit log
        await AuditLog.create({
            user: user._id,
            action: 'login',
            resourceType: 'user',
            resourceId: user._id,
            details: 'User logged in',
        });

        res.json({
            success: true,
            token,
            user: user.toJSON(),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('department', 'name ward');
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/auth/users  — list all users (admin/engineer/finance)
router.get('/users', protect, authorize('admin', 'engineer', 'financial_officer'), async (req, res) => {
    try {
        const { role } = req.query;
        const filter = {};
        if (role) filter.role = role;

        const users = await User.find(filter).select('-password').populate('department', 'name ward');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// In-memory OTP storage
const otpStore = new Map();

// Helper to send SMS via Fast2SMS using Quick SMS route (POST request)
const sendFast2SMSSMS = (phone, otp) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.FAST2SMS_API_KEY;
        if (!apiKey) {
            return reject(new Error('FAST2SMS_API_KEY is not defined in environment'));
        }

        // Fast2SMS API bulkV2 payload using Quick SMS route to bypass website verification requirements
        const postData = JSON.stringify({
            route: 'q',
            message: `Your UrbanHeliX verification code is: ${otp}`,
            language: 'english',
            flash: 0,
            numbers: phone
        });

        const options = {
            hostname: 'www.fast2sms.com',
            path: '/dev/bulkV2',
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.return === true) {
                        resolve(parsed);
                    } else {
                        reject(new Error(parsed.message || 'Fast2SMS returned failure response'));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse Fast2SMS response: ${body}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.write(postData);
        req.end();
    });
};

// POST /api/auth/otp/send
router.post('/otp/send', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

        otpStore.set(phone, { otp, expires });

        // Find user by phone, or create a new citizen user
        let user = await User.findOne({ phone });
        if (!user) {
            // Generate unique placeholder email and password
            const placeholderEmail = `citizen.${phone}@urbanhelix.gov`;
            const placeholderPassword = `citizen_otp_pass_${phone}_${Math.random().toString(36).slice(-8)}`;
            
            user = await User.create({
                name: `Citizen ${phone.slice(-4)}`,
                email: placeholderEmail,
                password: placeholderPassword,
                role: 'citizen',
                phone: phone
            });
        }

        console.log(`[OTP] Simulated SMS for ${phone}: ${otp}`);

        let smsSent = false;
        let smsError = '';
        try {
            await sendFast2SMSSMS(phone, otp);
            smsSent = true;
            console.log(`[OTP] Real SMS delivered to ${phone}`);
        } catch (err) {
            smsError = err.message;
            console.warn(`[OTP] Real SMS delivery failed: ${smsError}`);
        }

        res.json({
            success: true,
            otp,
            smsSent,
            message: smsSent 
                ? `OTP sent successfully to your phone!` 
                : `OTP generated. (Demo Code: ${otp}). SMS delivery log: ${smsError}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/otp/verify
router.post('/otp/verify', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
        }

        const storedData = otpStore.get(phone);
        if (!storedData) {
            return res.status(400).json({ success: false, message: 'OTP not requested or expired' });
        }

        if (Date.now() > storedData.expires) {
            otpStore.delete(phone);
            return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
        }

        if (storedData.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid verification code' });
        }

        // Clear OTP after successful use
        otpStore.delete(phone);

        // Find corresponding user
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Associated citizen profile not found' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Create audit log
        await AuditLog.create({
            user: user._id,
            action: 'login',
            resourceType: 'user',
            resourceId: user._id,
            details: `Citizen logged in via OTP verification (Phone: ${phone})`,
        });

        res.json({
            success: true,
            token,
            user: user.toJSON()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
