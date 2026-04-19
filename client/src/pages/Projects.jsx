import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, deptAPI, authAPI } from '../services/api';
import { Link } from 'react-router-dom';

export default function Projects() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [filter, setFilter] = useState({ status: '', category: '' });
    const [imageFile, setImageFile] = useState(null);
    const [reportFile, setReportFile] = useState(null);
    const [form, setForm] = useState({
        title: '', description: '', category: 'road', estimatedBudget: '', department: '', priority: 'medium',
        location: { ward: '', address: '' },
    });

    useEffect(() => { loadData(); }, [filter]);

    const loadData = async () => {
        try {
            const params = {};
            if (filter.status) params.status = filter.status;
            if (filter.category) params.category = filter.category;
            const [projRes, deptRes] = await Promise.all([
                projectAPI.getAll(params),
                deptAPI.getAll(),
            ]);
            setProjects(projRes.data.projects || []);
            setDepartments(deptRes.data.departments || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => {
                if (typeof form[key] === 'object') {
                    formData.append(key, JSON.stringify(form[key]));
                } else {
                    formData.append(key, form[key]);
                }
            });
            if (imageFile) formData.append('image', imageFile);
            if (reportFile) formData.append('report', reportFile);

            await projectAPI.create(formData);
            setShowModal(false);
            setForm({ title: '', description: '', category: 'road', estimatedBudget: '', department: '', priority: 'medium', location: { ward: '', address: '' } });
            setImageFile(null);
            setReportFile(null);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error creating project'); }
    };

    const handleApprove = async (id) => {
        const budget = prompt('Enter allocated budget amount:');
        if (!budget) return;
        try {
            await projectAPI.approve(id, { allocatedBudget: Number(budget), remarks: 'Approved' });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const openAssign = async (project) => {
        setSelectedProject(project);
        try {
            const res = await authAPI.getUsers('contractor');
            setContractors(res.data.users || []);
        } catch (e) { }
        setShowAssignModal(true);
    };

    const handleAssign = async (contractorId) => {
        try {
            await projectAPI.assign(selectedProject._id, {
                contractorId,
                startDate: new Date(),
                expectedEndDate: new Date(Date.now() + 180 * 86400000),
            });
            setShowAssignModal(false);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleUpdateStatus = async (id) => {
        const status = prompt('Enter new status (in_progress, verification, completed):');
        if (!status) return;
        const remarks = prompt('Remarks:');
        try {
            await projectAPI.updateStatus(id, { status, remarks });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error updating status'); }
    };

    // New handleEdit for generic edits
    const handleEdit = (project) => {
        setSelectedProject(project);
        setForm({
            title: project.title,
            description: project.description,
            category: project.category,
            estimatedBudget: project.allocatedBudget || project.estimatedBudget,
            department: project.department?._id || project.department,
            priority: project.priority,
            location: project.location || { ward: '', address: '' },
        });
        setShowModal(true);
    };

    const formatCurrency = (amt) => {
        if (!amt) return '—';
        if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading projects...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Projects</h1>
                <p className="page-subtitle">Municipal infrastructure projects lifecycle</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <select className="form-select" style={{ width: 'auto' }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                    <option value="">All Status</option>
                    <option value="proposed">Proposed</option>
                    <option value="approved">Approved</option>
                    <option value="in_progress">In Progress</option>
                    <option value="verification">Verification</option>
                    <option value="completed">Completed</option>
                </select>
                <select className="form-select" style={{ width: 'auto' }} value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
                    <option value="">All Categories</option>
                    <option value="road">Road</option>
                    <option value="water_supply">Water Supply</option>
                    <option value="sanitation">Sanitation</option>
                    <option value="electricity">Electricity</option>
                    <option value="park">Park</option>
                    <option value="bridge">Bridge</option>
                    <option value="building">Building</option>
                    <option value="drainage">Drainage</option>
                </select>
                {(user?.role === 'citizen' || user?.role === 'admin') && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Proposal</button>
                )}
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Category</th>
                            <th>Department</th>
                            <th>Budget</th>
                            <th>Spent</th>
                            <th>Status</th>
                            <th>Priority</th>
                            {['engineer', 'admin', 'contractor'].includes(user?.role) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((p) => (
                            <tr key={p._id}>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        {p.imageUrl && <img src={`http://localhost:5000${p.imageUrl}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />}
                                        <div>
                                            <Link to={`/projects/${p._id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>
                                                {p.title}
                                            </Link>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{p.location?.ward}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span className="badge badge-approved">{p.category?.replace('_', ' ')}</span></td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{p.department?.name || '—'}</td>
                                <td style={{ fontWeight: 600 }}>{formatCurrency(p.allocatedBudget || p.estimatedBudget)}</td>
                                <td>{formatCurrency(p.spentBudget)}</td>
                                <td>
                                    <span className={`status-badge ${p.status}`}>{p.status.replace('_', ' ')}</span>
                                    {p.transactionHash && <div className="tx-tag">⛓️ {p.transactionHash.substring(0, 10)}...</div>}
                                </td>
                                <td><span className={`badge badge-${p.priority === 'critical' ? 'rejected' : p.priority === 'high' ? 'proposed' : 'completed'}`}>{p.priority}</span></td>
                                {(['engineer', 'admin'].includes(user?.role) || (user?.role === 'contractor' && p.contractor?._id === user?._id)) && (
                                    <td>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {['engineer', 'admin'].includes(user?.role) && p.status === 'proposed' && (
                                                <button className="btn btn-success btn-sm" onClick={() => handleApprove(p._id)}>Approve</button>
                                            )}
                                            {['engineer', 'admin'].includes(user?.role) && p.status === 'approved' && !p.contractor && (
                                                <button className="btn btn-primary btn-sm" onClick={() => openAssign(p)}>Assign</button>
                                            )}
                                            {(['engineer', 'admin'].includes(user?.role) || (user?.role === 'contractor' && p.contractor?._id === user?._id)) &&
                                                ['approved', 'in_progress', 'verification'].includes(p.status) && (
                                                    <button className="btn btn-outline btn-sm" onClick={() => handleUpdateStatus(p._id)}>Status</button>
                                                )}
                                            {user?.role === 'admin' && (
                                                <button className="btn btn-outline btn-sm" onClick={() => handleEdit(p)}>Edit</button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {projects.length === 0 && (
                            <tr><td colSpan="8" className="empty-state">No projects found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Project Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Submit Project Proposal</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Project Title</label>
                                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                        <option value="road">Road</option>
                                        <option value="water_supply">Water Supply</option>
                                        <option value="sanitation">Sanitation</option>
                                        <option value="electricity">Electricity</option>
                                        <option value="park">Park</option>
                                        <option value="bridge">Bridge</option>
                                        <option value="building">Building</option>
                                        <option value="drainage">Drainage</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Estimated Budget (₹)</label>
                                    <input className="form-input" type="number" value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} required />
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select className="form-select" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                                        <option value="">Select...</option>
                                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Project Photo (Optional)</label>
                                    <input type="file" className="form-input" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">DPR / Report (Optional)</label>
                                    <input type="file" className="form-input" accept=".pdf,.doc,.docx" onChange={(e) => setReportFile(e.target.files[0])} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ward / Location</label>
                                <input className="form-input" value={form.location.address} onChange={(e) => setForm({ ...form, location: { ...form.location, address: e.target.value } })} placeholder="e.g., Sector 12, Main Road" />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" className="btn btn-primary">Submit Proposal</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign Contractor Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Assign Contractor</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Select a contractor for: <strong>{selectedProject?.title}</strong></p>
                        {contractors.map(c => (
                            <div key={c._id} className="glass-card" style={{ marginBottom: '8px', cursor: 'pointer', padding: '14px' }} onClick={() => handleAssign(c._id)}>
                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
