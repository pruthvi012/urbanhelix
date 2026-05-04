import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstall, setShowInstall] = useState(false);
    const { login, register } = useAuth();
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

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setShowInstall(false);
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

    return (
        <div className="login-page">
            <div className="login-card">

                {showInstall && (
                    <div style={{
                        background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                        border: '1px solid rgba(99,102,241,0.4)',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>📲</span>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>Install UrbanHelixX App</div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>Add to home screen for quick access</div>
                            </div>
                        </div>
                        <button onClick={handleInstall} style={{
                            background: '#6366f1', color: '#fff', border: 'none',
                            borderRadius: '8px', padding: '8px 16px', fontWeight: 700,
                            cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap'
                        }}>
                            Install
                        </button>
                    </div>
                )}

                <div className="login-logo">
                    <div className="login-logo-icon">🏛️</div>
                    <h1>UrbanHeliX</h1>
                    <p>Municipal Fund Monitoring & Governance</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid var(--accent-red)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--accent-red)' }}>
                        {error}
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" type="text" placeholder="Enter your name" value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input className="form-input" type="email" placeholder="you@example.com" value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" placeholder="••••••••" value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                    </div>

                    {isRegister && (
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select className="form-select" value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                <option value="citizen">Citizen</option>
                                <option value="engineer">Engineer / Authority</option>
                                <option value="contractor">Contractor</option>
                                <option value="financial_officer">Financial Officer</option>
                            </select>
                        </div>
                    )}

                    <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
                        {loading ? '⏳ Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    {isRegister ? (
                        <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); }}>Sign In</a></p>
                    ) : (
                        <p>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); }}>Register</a></p>
                    )}
                </div>

                {!isRegister && (
                    <div style={{ 
                        marginTop: '28px', 
                        padding: '20px', 
                        background: '#f8fafc', 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                        <p style={{ 
                            fontSize: '12px', 
                            fontWeight: 700, 
                            color: '#b91c1c', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px',
                            textAlign: 'center', 
                            marginBottom: '16px' 
                        }}>
                            ⚡ Quick Portal Access
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            <button 
                                type="button"
                                className="btn btn-outline" 
                                style={{ 
                                    background: '#ffffff', 
                                    fontSize: '12px', 
                                    padding: '12px 8px',
                                    border: '1px solid #e2e8f0',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}
                                onClick={() => login('ananya@citizen.com', 'password123').then(() => navigate('/')).catch(err => setError(err.response?.data?.message || err.message))}
                            >
                                <span style={{ fontSize: '18px' }}>👤</span>
                                <span>Public Citizen</span>
                            </button>
                            <button 
                                type="button"
                                className="btn btn-outline" 
                                style={{ 
                                    background: '#ffffff', 
                                    fontSize: '12px', 
                                    padding: '12px 8px',
                                    border: '1px solid #e2e8f0',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}
                                onClick={() => login('rajesh.engineer@urbanhelix.gov', 'password123').then(() => navigate('/')).catch(err => setError(err.response?.data?.message || err.message))}
                            >
                                <span style={{ fontSize: '18px' }}>🔧</span>
                                <span>District Engineer</span>
                            </button>
                            <button 
                                type="button"
                                className="btn btn-outline" 
                                style={{ 
                                    background: '#ffffff', 
                                    fontSize: '12px', 
                                    padding: '12px 8px',
                                    border: '1px solid #e2e8f0',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}
                                onClick={() => login('vikram@contractor.com', 'password123').then(() => navigate('/')).catch(err => setError(err.response?.data?.message || err.message))}
                            >
                                <span style={{ fontSize: '18px' }}>🏗️</span>
                                <span>Project Contractor</span>
                            </button>
                            <button 
                                type="button"
                                className="button" 
                                style={{ 
                                    background: '#ffffff', 
                                    fontSize: '12px', 
                                    padding: '12px 8px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    fontWeight: 600
                                }}
                                onClick={() => login('sunita.finance@urbanhelix.gov', 'password123').then(() => navigate('/')).catch(err => setError(err.response?.data?.message || err.message))}
                            >
                                <span style={{ fontSize: '18px' }}>💰</span>
                                <span>Finance Officer</span>
                            </button>
                        </div>
                        <button 
                            type="button"
                            className="btn btn-primary" 
                            style={{ 
                                width: '100%', 
                                marginTop: '10px', 
                                justifyContent: 'center',
                                fontSize: '13px',
                                background: '#1e293b'
                            }}
                            onClick={() => login('admin@urbanhelix.gov', 'password123').then(() => navigate('/')).catch(err => setError(err.response?.data?.message || err.message))}
                        >
                            🛡️ System Administrator Access
                        </button>
                    </div>
                )}
                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: 'rgba(0,0,0,0.2)' }}>
                    Debug Backend: {import.meta.env.VITE_API_URL || 'Local /api'}
                </div>
            </div>
        </div>
    );
}
