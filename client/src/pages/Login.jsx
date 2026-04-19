import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'citizen' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

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
                    <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(59,130,246,0.08)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <strong style={{ color: 'var(--accent-blue)' }}>Demo Credentials</strong> (password: password123)
                        <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                            <span>🔑 admin@urbanhelix.gov</span>
                            <span>🔧 rajesh.engineer@urbanhelix.gov</span>
                            <span>🏗️ vikram@contractor.com</span>
                            <span>💰 sunita.finance@urbanhelix.gov</span>
                            <span>👤 ananya@citizen.com</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
