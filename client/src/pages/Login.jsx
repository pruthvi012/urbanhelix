import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FiShield, FiActivity, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { authAPI } from '../services/api';

const ROLES = [
    { key: 'admin', label: 'City Admin', desc: 'Monitor governance, risk, and...', email: 'admin@urbanhelix.gov', avatar: 'AS' },
    { key: 'engineer', label: 'Site Engineer', desc: 'Technical & field audit...', email: 'rajesh.engineer@urbanhelix.gov', avatar: 'RK' },
    { key: 'contractor', label: 'Project Contractor', desc: 'Civil works execution...', email: 'vikram@contractor.com', avatar: 'VM' },
    { key: 'financial_officer', label: 'Finance Officer', desc: 'Treasury & escrow release...', email: 'sunita.finance@urbanhelix.gov', avatar: 'SS' },
    { key: 'citizen', label: 'Public Citizen', desc: 'Municipal command center...', email: 'ananya@citizen.com', avatar: 'AD' }
];

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstall, setShowInstall] = useState(false);
    
    // OTP states
    const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [demoOtp, setDemoOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    // Quick role selector states
    const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [showPolicy, setShowPolicy] = useState(false);
    const dropdownRef = useRef(null);

    const { login, register, loginWithOTP } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstall(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Set form fields based on selected role
    useEffect(() => {
        if (!isRegister) {
            const roleObj = ROLES[selectedRoleIndex];
            setForm(f => ({ ...f, email: roleObj.email, password: 'password123', role: roleObj.key }));
            if (roleObj.key === 'citizen') {
                setLoginMethod('otp');
                setPhone('9876543210');
                setOtpSent(false);
                setOtp('');
                setDemoOtp('');
            } else {
                setLoginMethod('password');
            }
        }
    }, [selectedRoleIndex, isRegister]);

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowRoleDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setShowInstall(false);
    };
    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        if (!phone) {
            setError('Please enter a valid phone number');
            return;
        }
        setError('');
        setOtpLoading(true);
        try {
            const { data } = await authAPI.sendOTP(phone);
            if (data.success) {
                setOtpSent(true);
                setDemoOtp(data.otp);
            } else {
                setError(data.message || 'Failed to send OTP');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to send OTP');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        if (e) e.preventDefault();
        if (!otp) {
            setError('Please enter the verification code');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await loginWithOTP(phone, otp);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                await register(form);
            } else {
                await login(form.email, form.password);
            }
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const activeRole = ROLES[selectedRoleIndex];

    return (
        <>
        <div className="login-container">
            {/* Embedded styles for pristine visual matching */}
            <style>{`
                .login-container {
                    display: flex;
                    min-height: 100vh;
                    width: 100vw;
                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                    background-color: #fafbfc;
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                .login-left-panel {
                    flex: 1.1;
                    background-color: #0d231e;
                    padding: 56px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    color: #ffffff;
                    position: relative;
                }

                @media (max-width: 1024px) {
                    .login-left-panel {
                        display: none;
                    }
                }

                .login-left-logo {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 24px;
                    font-weight: 700;
                    color: #ffffff;
                    text-decoration: none;
                }

                .login-left-logo-icon {
                    color: #2dd4bf;
                    font-size: 26px;
                    display: flex;
                    align-items: center;
                }

                .login-left-hero {
                    max-width: 440px;
                    margin-top: -40px;
                }

                .login-left-headline {
                    font-family: 'Georgia', serif;
                    font-size: 46px;
                    font-weight: 400;
                    line-height: 1.25;
                    margin-bottom: 24px;
                    color: #ffffff;
                }

                .login-left-headline-highlight {
                    display: block;
                    font-family: 'Georgia', serif;
                    font-style: italic;
                    color: #2dd4bf;
                }

                .login-left-subtitle {
                    font-size: 15px;
                    line-height: 1.6;
                    color: #94a3b8;
                }

                .login-left-footer {
                    font-size: 13px;
                    color: #475569;
                }

                .login-right-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 56px;
                    position: relative;
                    background-color: #f8fafc;
                }

                @media (max-width: 768px) {
                    .login-right-panel {
                        padding: 32px 20px;
                    }
                }

                .login-role-switcher-container {
                    position: absolute;
                    top: 32px;
                    right: 32px;
                    z-index: 10;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }

                @media (max-width: 768px) {
                    .login-role-switcher-container {
                        position: relative;
                        top: 0;
                        right: 0;
                        margin-bottom: 32px;
                        width: 100%;
                        max-width: 400px;
                        display: flex;
                        justify-content: flex-end;
                    }
                }

                .login-role-pill {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 8px 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    transition: all 0.2s ease;
                    user-select: none;
                    width: 240px;
                    justify-content: space-between;
                }

                .login-role-pill:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                }

                .login-role-pill-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    min-width: 0;
                }

                .login-role-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background-color: #fef3c7;
                    color: #d97706;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    flex-shrink: 0;
                }

                .login-role-info {
                    text-align: left;
                    min-width: 0;
                }

                .login-role-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1.2;
                }

                .login-role-desc {
                    font-size: 10px;
                    color: #64748b;
                    line-height: 1.2;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .login-role-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    width: 240px;
                    overflow: hidden;
                    z-index: 20;
                }

                .login-role-option {
                    width: 100%;
                    border: none;
                    background: transparent;
                    padding: 10px 14px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    transition: background 0.15s ease;
                    text-align: left;
                }

                .login-role-option:hover {
                    background: #f1f5f9;
                }

                .login-role-option.active {
                    background: #f0fdfa;
                }

                .login-form-wrapper {
                    width: 100%;
                    max-width: 400px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .login-secure-badge {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: 1px solid #ccfbf1;
                    background-color: #f0fdfa;
                    color: #0d9488;
                    font-size: 20px;
                    margin-bottom: 24px;
                }

                .login-secure-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: #0d9488;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                }

                .login-form-heading {
                    font-family: 'Georgia', serif;
                    font-size: 32px;
                    font-weight: 400;
                    color: #0f172a;
                    margin-bottom: 8px;
                    text-align: center;
                }

                .login-form-subheading {
                    font-size: 14px;
                    color: #64748b;
                    margin-bottom: 32px;
                    text-align: center;
                }

                .login-form-container {
                    width: 100%;
                }

                .login-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-bottom: 20px;
                    width: 100%;
                }

                .login-field-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: #334155;
                    text-align: left;
                }

                .login-field-input {
                    width: 100%;
                    height: 46px;
                    padding: 12px 16px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    color: #0f172a;
                    background-color: #ffffff;
                    transition: all 0.2s ease;
                }

                .login-field-input::placeholder {
                    color: #94a3b8;
                }

                .login-field-input:focus {
                    outline: none;
                    border-color: #0d9488;
                    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
                }

                .login-field-select {
                    width: 100%;
                    height: 46px;
                    padding: 12px 16px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-size: 14px;
                    color: #0f172a;
                    background-color: #ffffff;
                    transition: all 0.2s ease;
                }

                .login-field-select:focus {
                    outline: none;
                    border-color: #0d9488;
                }

                .login-form-options {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 4px;
                    margin-bottom: 24px;
                    width: 100%;
                    font-size: 13px;
                }

                .login-checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #475569;
                    cursor: pointer;
                    user-select: none;
                }

                .login-forgot-link {
                    color: #0d9488;
                    font-weight: 600;
                    text-decoration: none;
                    transition: color 0.15s ease;
                }

                .login-forgot-link:hover {
                    color: #0f766e;
                    text-decoration: underline;
                }

                .login-submit-btn {
                    width: 100%;
                    height: 48px;
                    background-color: #0d9488;
                    color: #ffffff;
                    border: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }

                .login-submit-btn:hover {
                    background-color: #0f766e;
                }

                .login-submit-btn:disabled {
                    background-color: #94a3b8;
                    cursor: not-allowed;
                }

                .login-policy-text {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 24px;
                    text-align: center;
                    line-height: 1.5;
                }

                .login-footer-switch {
                    text-align: center;
                    margin-top: 20px;
                    font-size: 13px;
                    color: #64748b;
                }

                .login-footer-switch a {
                    color: #0d9488;
                    font-weight: 700;
                    text-decoration: none;
                }

                .login-tab-container {
                    display: flex;
                    width: 100%;
                    background-color: #f1f5f9;
                    border-radius: 12px;
                    padding: 4px;
                    margin-bottom: 24px;
                }

                .login-tab-btn {
                    flex: 1;
                    border: none;
                    background: none;
                    padding: 10px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }

                .login-tab-btn.active {
                    background-color: #ffffff;
                    color: #0f172a;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06);
                }

                .login-otp-demo-banner {
                    background: #f0fdf4;
                    border: 1px dashed #bbf7d0;
                    border-radius: 10px;
                    padding: 12px 16px;
                    margin-bottom: 24px;
                    color: #166534;
                    font-size: 13px;
                    line-height: 1.5;
                    text-align: left;
                    width: 100%;
                }
            `}</style>

            {/* Left Panel: Branding & Taglines */}
            <div className="login-left-panel">
                <Link to="/" className="login-left-logo">
                    <span className="login-left-logo-icon"><FiActivity /></span>
                    <span>UrbanHelix</span>
                </Link>

                <div className="login-left-hero">
                    <h1 className="login-left-headline">
                        The city has a 
                        <span className="login-left-headline-highlight">memory.</span>
                    </h1>
                    <p className="login-left-subtitle">
                        One secure place to follow projects, payments, grievances, and the public record.
                    </p>
                </div>

                <div className="login-left-footer">
                    Civic infrastructure, made visible.
                </div>
            </div>

            {/* Right Panel: Login Form & Selector */}
            <div className="login-right-panel">
                {/* Floating Role Quick Switcher (only shown on Sign In view) */}
                {!isRegister && loginMethod === 'password' && (
                    <div className="login-role-switcher-container" ref={dropdownRef}>
                        <div 
                            className="login-role-pill" 
                            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                            title="Click to select a demo profile"
                        >
                            <div className="login-role-pill-left">
                                <div className="login-role-avatar">
                                    {activeRole.avatar}
                                </div>
                                <div className="login-role-info">
                                    <div className="login-role-title">{activeRole.label}</div>
                                    <div className="login-role-desc">{activeRole.desc}</div>
                                </div>
                            </div>
                            <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                {showRoleDropdown ? <FiChevronUp /> : <FiChevronDown />}
                            </div>
                        </div>

                        {showRoleDropdown && (
                            <div className="login-role-dropdown">
                                {ROLES.map((role, idx) => (
                                    <button
                                        key={role.key}
                                        type="button"
                                        className={`login-role-option ${selectedRoleIndex === idx ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedRoleIndex(idx);
                                            setShowRoleDropdown(false);
                                        }}
                                    >
                                        <div className="login-role-avatar">
                                            {role.avatar}
                                        </div>
                                        <div className="login-role-info">
                                            <div className="login-role-title">{role.label}</div>
                                            <div className="login-role-desc">{role.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="login-form-wrapper">
                    {/* PWA App Install Banner */}
                    {showInstall && (
                        <div style={{
                            background: 'linear-gradient(135deg, #0d231e, #0a1815)',
                            border: '1px solid rgba(45,212,191,0.3)',
                            borderRadius: '12px',
                            padding: '14px 18px',
                            marginBottom: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            width: '100%',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '24px' }}>📲</span>
                                <div>
                                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>Install UrbanHelix</div>
                                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>Access your city dashboard from home screen</div>
                                </div>
                            </div>
                            <button onClick={handleInstall} style={{
                                background: '#0d9488', color: '#fff', border: 'none',
                                borderRadius: '8px', padding: '8px 16px', fontWeight: 700,
                                cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
                            }}>
                                Install
                            </button>
                        </div>
                    )}

                    {/* Shield Icon */}
                    <div className="login-secure-badge">
                        <FiShield />
                    </div>

                    <span className="login-secure-label">SECURE ACCESS</span>
                    
                    <h2 className="login-form-heading">
                        {isRegister ? 'Create Account' : 'Welcome to UrbanHeliX'}
                    </h2>
                    
                    <p className="login-form-subheading">
                        {isRegister ? 'Join the UrbanHeliX civic platform.' : 'Where every city decision becomes visible.'}
                    </p>

                    {error && (
                        <div style={{ 
                            background: 'rgba(239,68,68,0.08)', 
                            border: '1px solid #fee2e2', 
                            borderRadius: '8px', 
                            padding: '12px 14px', 
                            marginBottom: '20px', 
                            fontSize: '13px', 
                            color: '#ef4444',
                            width: '100%',
                            textAlign: 'left'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {!isRegister && (
                        <div className="login-tab-container">
                            <button 
                                type="button" 
                                className={`login-tab-btn ${loginMethod === 'otp' ? 'active' : ''}`}
                                onClick={() => { setLoginMethod('otp'); setError(''); }}
                            >
                                👥 Citizen Access
                            </button>
                            <button 
                                type="button" 
                                className={`login-tab-btn ${loginMethod === 'password' ? 'active' : ''}`}
                                onClick={() => { setLoginMethod('password'); setError(''); }}
                            >
                                💼 Officer Portal
                            </button>
                        </div>
                    )}

                    <form 
                        className="login-form-container" 
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (isRegister) {
                                handleSubmit(e);
                            } else if (loginMethod === 'otp') {
                                if (otpSent) {
                                    handleVerifyOTP(e);
                                } else {
                                    handleSendOTP(e);
                                }
                            } else {
                                handleSubmit(e);
                            }
                        }}
                    >
                        {isRegister ? (
                            <>
                                <div className="login-field-group">
                                    <label className="login-field-label">Full Name</label>
                                    <input 
                                        className="login-field-input" 
                                        type="text" 
                                        placeholder="Enter your name" 
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })} 
                                        required 
                                    />
                                </div>

                                <div className="login-field-group">
                                    <label className="login-field-label">Email address</label>
                                    <input 
                                        className="login-field-input" 
                                        type="email" 
                                        placeholder="you@city.gov" 
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })} 
                                        required 
                                    />
                                </div>

                                <div className="login-field-group">
                                    <label className="login-field-label">Password</label>
                                    <input 
                                        className="login-field-input" 
                                        type="password" 
                                        placeholder="Enter your password" 
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })} 
                                        required 
                                    />
                                </div>

                                <div className="login-field-group">
                                    <label className="login-field-label">Role</label>
                                    <select 
                                        className="login-field-select" 
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    >
                                        <option value="citizen">Citizen</option>
                                        <option value="engineer">Engineer / Authority</option>
                                        <option value="contractor">Contractor</option>
                                        <option value="financial_officer">Financial Officer</option>
                                    </select>
                                </div>

                                <button className="login-submit-btn" type="submit" disabled={loading}>
                                    {loading ? '⏳ Please wait...' : 'Create Account'}
                                </button>
                            </>
                        ) : loginMethod === 'otp' ? (
                            <>
                                {otpSent && demoOtp && (
                                    <div className="login-otp-demo-banner">
                                        🔒 <strong>Demo Mode Verification Code</strong><br />
                                        A simulated OTP <strong>{demoOtp}</strong> has been generated for phone <strong>{phone}</strong>.
                                    </div>
                                )}

                                {!otpSent ? (
                                    <div className="login-field-group">
                                        <label className="login-field-label">Mobile Phone Number</label>
                                        <input 
                                            className="login-field-input" 
                                            type="tel" 
                                            placeholder="Enter 10-digit phone number" 
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                                            required 
                                        />
                                    </div>
                                ) : (
                                    <div className="login-field-group">
                                        <label className="login-field-label">6-Digit Verification Code</label>
                                        <input 
                                            className="login-field-input" 
                                            type="text" 
                                            placeholder="Enter verification code" 
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                                            required 
                                        />
                                    </div>
                                )}

                                {otpSent && (
                                    <div className="login-form-options">
                                        <a href="#" className="login-forgot-link" onClick={(e) => { e.preventDefault(); setOtpSent(false); setOtp(''); }}>
                                            Change phone number
                                        </a>
                                    </div>
                                )}

                                <button className="login-submit-btn" type="submit" disabled={loading || otpLoading}>
                                    {loading || otpLoading ? '⏳ Please wait...' : !otpSent ? (
                                        <>
                                            <span>Send Verification Code</span>
                                            <span>&rarr;</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Verify & Login</span>
                                            <span>&rarr;</span>
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="login-field-group">
                                    <label className="login-field-label">Email address</label>
                                    <input 
                                        className="login-field-input" 
                                        type="email" 
                                        placeholder="you@city.gov" 
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })} 
                                        required 
                                    />
                                </div>

                                <div className="login-field-group">
                                    <label className="login-field-label">Password</label>
                                    <input 
                                        className="login-field-input" 
                                        type="password" 
                                        placeholder="Enter your password" 
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })} 
                                        required 
                                    />
                                </div>

                                <div className="login-form-options">
                                    <label className="login-checkbox-label" htmlFor="remember-me">
                                        <input type="checkbox" id="remember-me" defaultChecked style={{ accentColor: '#0d9488' }} />
                                        <span>Remember me</span>
                                    </label>
                                    <a href="#forgot" className="login-forgot-link" onClick={(e) => { e.preventDefault(); alert('Password reset is managed by municipal administration. Please contact support.'); }}>
                                        Forgot password?
                                    </a>
                                </div>

                                <button className="login-submit-btn" type="submit" disabled={loading}>
                                    {loading ? '⏳ Please wait...' : (
                                        <>
                                            <span>Sign In</span>
                                            <span>&rarr;</span>
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </form>

                    <p className="login-policy-text">
                        By continuing, you agree to the UrbanHeliX <a href="#terms" onClick={(e) => { e.preventDefault(); setShowPolicy(true); }}>access policy</a>.
                    </p>

                    <div className="login-footer-switch">
                        {isRegister ? (
                            <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); }}>Sign In</a></p>
                        ) : (
                            <p>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); }}>Register</a></p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* ─── ACCESS POLICY MODAL ─── */}
        {showPolicy && (
            <div
                onClick={() => setShowPolicy(false)}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px'
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: '#ffffff', borderRadius: '20px',
                        width: '100%', maxWidth: '620px',
                        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Modal Header */}
                    <div style={{
                        padding: '28px 32px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: '#f0fdfa', border: '1px solid #ccfbf1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#0d9488', fontSize: '18px'
                            }}>
                                🛡️
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                    UrbanHeliX Access Policy
                                </h2>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                                    Effective: August 2025 · Municipal Civic Platform
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPolicy(false)}
                            style={{
                                background: '#f1f5f9', border: 'none', borderRadius: '8px',
                                width: '32px', height: '32px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '18px', color: '#64748b', fontWeight: 700
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Modal Scrollable Body */}
                    <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1 }}>
                        {[
                            {
                                icon: '🏛️',
                                title: '1. Purpose of Access',
                                text: 'UrbanHeliX is an official civic transparency platform operated by the Municipal Corporation. Access is granted strictly for tracking public infrastructure projects, monitoring fund allocation, submitting grievances, and participating in civic governance. Any use beyond these purposes is strictly prohibited.'
                            },
                            {
                                icon: '👥',
                                title: '2. User Roles & Permissions',
                                text: 'Citizens may view public project data, grievance statuses, and budget summaries. Contractors and Site Engineers may update milestones and upload progress documentation for their assigned projects. Financial Officers may authorize fund releases and escrow transactions. City Admins have full access to all modules. Access is role-bound and may not be shared or transferred.'
                            },
                            {
                                icon: '📊',
                                title: '3. Data Collection & Usage',
                                text: 'We collect your name, email address, role information, and activity logs (page visits, API calls, file uploads). This data is used solely to operate the platform, enforce accountability, and generate audit reports. We do not sell or share your personal data with third parties. All data is stored securely on government-grade infrastructure.'
                            },
                            {
                                icon: '⛔',
                                title: '4. Prohibited Activities',
                                text: 'Users must not: falsify project progress, fabricate invoices or verification photos, attempt unauthorized access to other users\' data, scrape or bulk-export platform data, use automated bots or scripts, or tamper with any audit or blockchain records. Violations will result in immediate account suspension.'
                            },
                            {
                                icon: '🔗',
                                title: '5. Cryptographic Audit Trail',
                                text: 'All significant actions on UrbanHeliX — fund releases, milestone approvals, project status changes — are cryptographically hashed and stored in an immutable SHA-256 linked chain. By using this platform, you acknowledge that your actions are permanently recorded and cannot be altered, deleted, or disputed.'
                            },
                            {
                                icon: '🔒',
                                title: '6. Confidentiality of Sensitive Data',
                                text: 'Budget figures, escrow transaction details, contractor financial records, and project audit documents are confidential to authorized roles only. Citizens may view aggregated summaries. Unauthorized disclosure of role-restricted data to third parties is a violation of this policy and may attract legal consequences.'
                            },
                            {
                                icon: '🔑',
                                title: '7. Session & Credential Security',
                                text: 'You are fully responsible for maintaining the confidentiality of your login credentials. Sessions are cleared when you open a new browser tab or window. Do not share your password with anyone. If you suspect unauthorized access to your account, contact the system administrator immediately at admin@urbanhelix.gov.'
                            },
                            {
                                icon: '⚖️',
                                title: '8. Consequences of Violation',
                                text: 'Violation of this access policy may result in: immediate suspension of your account, escalation to the relevant municipal authority, and where applicable, legal action under the Information Technology Act, 2000 and related regulations. UrbanHeliX reserves the right to audit all user activity at any time without prior notice.'
                            }
                        ].map((section, i) => (
                            <div key={i} style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '18px' }}>{section.icon}</span>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                        {section.title}
                                    </h3>
                                </div>
                                <p style={{
                                    fontSize: '13px', color: '#475569',
                                    lineHeight: '1.7', margin: 0,
                                    paddingLeft: '28px'
                                }}>
                                    {section.text}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Modal Footer */}
                    <div style={{
                        padding: '20px 32px',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                            By signing in, you agree to all terms above.
                        </p>
                        <button
                            onClick={() => setShowPolicy(false)}
                            style={{
                                background: '#0d9488', color: '#fff',
                                border: 'none', borderRadius: '8px',
                                padding: '10px 24px', fontWeight: 700,
                                fontSize: '14px', cursor: 'pointer'
                            }}
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
