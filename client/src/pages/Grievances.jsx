import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI } from '../services/api';
import { FiThumbsUp, FiThumbsDown } from 'react-icons/fi';

export default function Grievances() {
    const { user } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ project: '', title: '', description: '', category: 'other' });
    const [file, setFile] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await grievanceAPI.getAll({});
            setGrievances(res.data.grievances || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleEdit = (grievance) => {
        setForm({ ...grievance, project: grievance.project?._id || grievance.project });
        setShowModal(true);
    };

    const handleVote = async (id, type) => {
        try {
            await grievanceAPI.vote(id, type);
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleResolve = async (id) => {
        const remarks = prompt('Resolution remarks:');
        if (!remarks) return;
        try {
            await grievanceAPI.resolve(id, { status: 'resolved', remarks });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => formData.append(key, form[key]));
            if (file) formData.append('image', file);

            if (form._id) {
                alert('Update functionality would go here');
            } else {
                await grievanceAPI.create(formData);
            }
            setShowModal(false);
            setForm({ project: '', title: '', description: '', category: 'other' });
            setFile(null);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Grievances</h1>
                <p className="page-subtitle">Citizen complaints and feedback on municipal projects</p>
            </div>

            {user && <button className="btn btn-primary" style={{ marginBottom: '20px' }} onClick={() => setShowModal(true)}>+ File Grievance</button>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {grievances.map(g => (
                    <div key={g._id} className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                    <span className={`badge badge-${g.category === 'corruption' || g.category === 'fund_misuse' ? 'rejected' : g.category === 'safety' ? 'proposed' : 'approved'}`}>{g.category?.replace('_', ' ')}</span>
                                    <span className={`badge badge-${g.status}`}>{g.status?.replace('_', ' ')}</span>
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>{g.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '8px' }}>{g.description}</p>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Project: <strong style={{ color: 'var(--text-secondary)' }}>{g.project?.title || '—'}</strong> • Filed by: {g.citizen?.name} • {new Date(g.createdAt).toLocaleDateString()}
                                </div>
                                {g.imageUrl && (
                                    <div style={{ marginTop: '10px' }}>
                                        <img src={`http://localhost:5000${g.imageUrl}`} alt="Grievance" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'cover' }} />
                                    </div>
                                )}
                                {g.resolution?.remarks && (
                                    <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', fontSize: '13px' }}>
                                        <strong style={{ color: 'var(--accent-green)' }}>Resolution:</strong> {g.resolution.remarks}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleVote(g._id, 'upvote')} style={{ padding: '6px 10px' }}>
                                    <FiThumbsUp /> {g.upvoteCount || 0}
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleVote(g._id, 'downvote')} style={{ padding: '6px 10px' }}>
                                    <FiThumbsDown /> {g.downvoteCount || 0}
                                </button>
                                {['engineer', 'admin'].includes(user?.role) && g.status !== 'resolved' && (
                                    <button className="btn btn-success btn-sm" onClick={() => handleResolve(g._id)} style={{ marginTop: '6px' }}>Resolve</button>
                                )}
                                {user?._id === g.citizen?._id && g.status === 'pending' && (
                                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(g)} style={{ marginTop: '6px' }}>Edit</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {grievances.length === 0 && <div className="empty-state">No grievances found</div>}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">File a Grievance</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Title</label>
                                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    <option value="delay">Delay</option>
                                    <option value="quality">Quality Issue</option>
                                    <option value="corruption">Corruption</option>
                                    <option value="fund_misuse">Fund Misuse</option>
                                    <option value="safety">Safety</option>
                                    <option value="environmental">Environmental</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Project ID</label>
                                <input className="form-input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} placeholder="Paste project ID" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Evidence Image (Optional)</label>
                                <input type="file" className="form-input" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
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
