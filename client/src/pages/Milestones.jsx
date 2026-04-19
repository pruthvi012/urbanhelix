import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { milestoneAPI, projectAPI } from '../services/api';

export default function Milestones() {
    const { user } = useAuth();
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [projects, setProjects] = useState([]);
    const [form, setForm] = useState({ project: '', title: '', description: '', milestoneNumber: 1, amount: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [msRes, projRes] = await Promise.all([
                milestoneAPI.getAll({}),
                projectAPI.getAll({ status: 'in_progress' }),
            ]);
            setMilestones(msRes.data.milestones || []);
            setProjects(projRes.data.projects || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await milestoneAPI.create({ ...form, amount: Number(form.amount), milestoneNumber: Number(form.milestoneNumber) });
            setShowModal(false);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleEngineerApprove = async (id, approved) => {
        const remarks = approved ? 'Approved by engineer' : prompt('Rejection reason:');
        if (!approved && !remarks) return;
        try {
            await milestoneAPI.engineerApprove(id, { approved, remarks });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleFinancialApprove = async (id, approved) => {
        const remarks = approved ? 'Financial approval granted' : prompt('Rejection reason:');
        if (!approved && !remarks) return;
        try {
            await milestoneAPI.financialApprove(id, { approved, remarks });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const formatCurrency = (amt) => {
        if (!amt) return '—';
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading milestones...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Milestones</h1>
                <p className="page-subtitle">Track project milestones and approval workflow</p>
            </div>

            {(user?.role === 'contractor' || user?.role === 'admin') && (
                <button className="btn btn-primary" style={{ marginBottom: '20px' }} onClick={() => setShowModal(true)}>+ Submit Milestone</button>
            )}

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr><th>#</th><th>Milestone</th><th>Project</th><th>Amount</th><th>Status</th><th>Engineer</th><th>Financial</th>
                            {['engineer', 'financial_officer', 'admin'].includes(user?.role) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {milestones.map(m => (
                            <tr key={m._id}>
                                <td style={{ fontWeight: 600 }}>{m.milestoneNumber}</td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{m.title}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.description?.substring(0, 60)}</div>
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{m.project?.title || '—'}</td>
                                <td style={{ fontWeight: 600 }}>{formatCurrency(m.amount)}</td>
                                <td><span className={`badge badge-${m.status}`}>{m.status?.replace('_', ' ')}</span></td>
                                <td>{m.engineerApproval?.approved ? <span style={{ color: 'var(--accent-green)' }}>✓</span> : '—'}</td>
                                <td>{m.financialApproval?.approved ? <span style={{ color: 'var(--accent-green)' }}>✓</span> : '—'}</td>
                                {['engineer', 'financial_officer', 'admin'].includes(user?.role) && (
                                    <td style={{ display: 'flex', gap: '6px' }}>
                                        {user?.role === 'engineer' && m.status === 'submitted' && !m.engineerApproval?.approved && (
                                            <>
                                                <button className="btn btn-success btn-sm" onClick={() => handleEngineerApprove(m._id, true)}>✓</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleEngineerApprove(m._id, false)}>✗</button>
                                            </>
                                        )}
                                        {user?.role === 'financial_officer' && m.status === 'under_review' && !m.financialApproval?.approved && (
                                            <>
                                                <button className="btn btn-success btn-sm" onClick={() => handleFinancialApprove(m._id, true)}>✓</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleFinancialApprove(m._id, false)}>✗</button>
                                            </>
                                        )}
                                        {user?.role === 'admin' && m.status === 'submitted' && (
                                            <button className="btn btn-success btn-sm" onClick={() => handleEngineerApprove(m._id, true)}>Approve</button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {milestones.length === 0 && <tr><td colSpan="8" className="empty-state">No milestones found</td></tr>}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Submit Milestone</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Project</label>
                                <select className="form-select" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
                                    <option value="">Select project...</option>
                                    {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                                </select>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Milestone Title</label>
                                    <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Milestone #</label>
                                    <input className="form-input" type="number" min="1" value={form.milestoneNumber} onChange={(e) => setForm({ ...form, milestoneNumber: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount (₹)</label>
                                <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" className="btn btn-primary">Submit</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
