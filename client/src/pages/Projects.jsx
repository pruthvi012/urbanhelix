import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, deptAPI, authAPI, wardAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';

export default function Projects() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showWardDir, setShowWardDir] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [wards, setWards] = useState([]);
    const [wardSearch, setWardSearch] = useState('');
    const [contractors, setContractors] = useState([]);
    const [gpsCameraRequested, setGpsCameraRequested] = useState(false);
    const [filter, setFilter] = useState({ status: '', category: '', wardNo: '', area: '', projectCode: '' });
    const [searchInput, setSearchInput] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [reportFile, setReportFile] = useState(null);
    const [form, setForm] = useState({
        title: '', description: '', category: 'road', estimatedBudget: '', enteredBudget: '', department: '', priority: 'medium',
        location: { ward: '', area: '', address: '' }, spentBudget: 0
    });
    const [budgetProof, setBudgetProof] = useState(null);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [revisionForm, setRevisionForm] = useState({ newBudget: '', reason: '' });

    useEffect(() => { loadData(); }, [filter]);

    const loadData = async () => {
        try {
            const params = {};
            if (filter.status) params.status = filter.status;
            if (filter.category) params.category = filter.category;
            if (filter.wardNo) params.wardNo = filter.wardNo;
            if (filter.area) params.area = filter.area;
            
            if (user?.role === 'contractor') {
                if (!filter.projectCode) {
                    setProjects([]);
                    setLoading(false);
                    return;
                }
                params.projectCode = filter.projectCode;
            }

            const [projRes, deptRes, wardRes] = await Promise.all([
                projectAPI.getAll(params),
                deptAPI.getAll(),
                (wardAPI && wardAPI.getAll) ? wardAPI.getAll() : fetch('/api/wards').then(r => r.json()),
            ]);
            setProjects(projRes.data?.projects || projRes.projects || []);
            setDepartments(deptRes.data?.departments || deptRes.departments || []);
            setWards(wardRes.data?.wards || wardRes.wards || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleGpsCameraRequest = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            setGpsCameraRequested(true);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm(prev => ({ 
                    ...prev, 
                    location: { ...prev.location, coordinates: { lat: position.coords.latitude, lng: position.coords.longitude } } 
                }));
                setGpsCameraRequested(true);
            },
            (error) => {
                alert('Location access is required to capture project evidence. Please enable GPS permissions in your browser/device settings.');
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedProject) {
                await projectAPI.update(selectedProject._id, form);
            } else {
                // Client-side validations
                if (!form.location.ward || !form.location.area) {
                    return alert("Please select both a Ward and an Area/Locality from the Ward Directory section.");
                }
                if (form.estimatedBudget !== form.enteredBudget) {
                    return alert("Estimated Budget and Confirm Budget must match exactly to proceed.");
                }

                const formData = new FormData();
                Object.keys(form).forEach(key => {
                    // Skip empty department field to avoid CastError
                    if (key === 'department' && form[key] === '') return;
                    
                    if (typeof form[key] === 'object') {
                        formData.append(key, JSON.stringify(form[key]));
                    } else {
                        formData.append(key, form[key]);
                    }
                });
                if (imageFile) formData.append('image', imageFile);
                if (reportFile) formData.append('report', reportFile);
                if (budgetProof) formData.append('budgetEstimateProof', budgetProof);
                await projectAPI.create(formData);
            }
            
            setShowModal(false);
            setSelectedProject(null);
            setForm({ title: '', description: '', category: 'road', estimatedBudget: '', enteredBudget: '', department: '', priority: 'medium', location: { ward: '', area: '', address: '' }, spentBudget: 0 });
            setImageFile(null);
            setReportFile(null);
            setBudgetProof(null);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error saving project'); }
    };

    const handleRevision = async (e) => {
        e.preventDefault();
        try {
            await projectAPI.reviseBudget(selectedProject._id, revisionForm);
            setShowRevisionModal(false);
            setRevisionForm({ newBudget: '', reason: '' });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error revising budget'); }
    };

    const handleApprove = async (id, estimatedBudget) => {
        try {
            await projectAPI.approve(id, { allocatedBudget: Number(estimatedBudget), remarks: 'Approved' });
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

    const formatCurrency = (amt) => {
        if (!amt) return '—';
        if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    const downloadProjectReport = async (projectId) => {
        try {
            const res = await projectAPI.getById(projectId);
            const p = res.data.project;
            if (!p) { alert('Could not load project data.'); return; }

            const fmt = (n) => n ? `Rs. ${Number(n).toLocaleString('en-IN')}` : 'Rs. 0';
            const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' }) : 'N/A';
            const utilRate = p.allocatedBudget > 0 ? ((p.spentBudget || 0) / p.allocatedBudget * 100).toFixed(1) : '0';
            const remaining = (p.allocatedBudget || 0) - (p.spentBudget || 0);

            const photos = (p.progressPhotos || []).map((ph, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${ph.description || 'No description'}</td>
                    <td>${fmtDate(ph.timestamp)}</td>
                </tr>
            `).join('');

            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BBMP Report - ${p.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 30px; }
        .header { background: #1e3a5f; color: white; text-align: center; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
        .header h1 { font-size: 28px; letter-spacing: 4px; margin-bottom: 4px; }
        .header h2 { font-size: 14px; font-weight: normal; margin-bottom: 4px; }
        .header p { font-size: 12px; opacity: 0.8; }
        .report-title { font-size: 20px; font-weight: bold; color: #1e3a5f; margin-bottom: 4px; }
        .generated { font-size: 11px; color: #64748b; margin-bottom: 24px; }
        .section-title { font-size: 15px; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin: 20px 0 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #1e3a5f; color: white; padding: 10px 14px; text-align: left; font-size: 12px; }
        td { padding: 9px 14px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) td { background: #f8fafc; }
        .label-col { font-weight: bold; color: #334155; width: 45%; }
        .fin-label { font-weight: bold; color: #334155; width: 60%; }
        .highlight { color: #059669; font-weight: bold; }
        .warning { color: #dc2626; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        @media print { body { padding: 10px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>BBMP</h1>
        <h2>Bruhat Bengaluru Mahanagara Palike</h2>
        <p>South Zone | UrbanHelixX Civic Monitoring Portal</p>
    </div>

    <div class="report-title">Project Status Report</div>
    <div class="generated">Generated on: ${new Date().toLocaleString('en-IN')}</div>

    <div class="section-title">Project Details</div>
    <table>
        <tr><td class="label-col">Project Name</td><td>${p.title || 'N/A'}</td></tr>
        <tr><td class="label-col">Category</td><td>${(p.category || 'N/A').replace(/_/g, ' ').toUpperCase()}</td></tr>
        <tr><td class="label-col">Current Status</td><td><strong>${(p.status || 'N/A').replace(/_/g, ' ').toUpperCase()}</strong></td></tr>
        <tr><td class="label-col">Priority</td><td>${(p.priority || 'N/A').toUpperCase()}</td></tr>
        <tr><td class="label-col">Ward</td><td>${p.location?.ward || 'N/A'}</td></tr>
        <tr><td class="label-col">Area / Locality</td><td>${p.location?.area || 'N/A'}</td></tr>
        <tr><td class="label-col">Specific Address</td><td>${p.location?.address || 'N/A'}</td></tr>
        <tr><td class="label-col">Proposed By</td><td>${p.proposedBy?.name || 'N/A'}</td></tr>
        <tr><td class="label-col">Proposal Date</td><td>${fmtDate(p.createdAt)}</td></tr>
        <tr><td class="label-col">Assigned Engineer</td><td class="${p.engineer?.name ? '' : 'warning'}">${p.engineer?.name || 'Not Yet Assigned'}</td></tr>
        <tr><td class="label-col">Assigned Contractor</td><td class="${p.contractor?.name ? '' : 'warning'}">${p.contractor?.name || 'Not Yet Assigned'}</td></tr>
        <tr><td class="label-col">Start Date</td><td>${fmtDate(p.startDate)}</td></tr>
        <tr><td class="label-col">Expected Completion</td><td>${fmtDate(p.expectedEndDate)}</td></tr>
    </table>

    <div class="section-title">Financial Summary</div>
    <table>
        <tr><th class="fin-label">Financial Metric</th><th>Amount</th></tr>
        <tr><td class="fin-label">Proposed Budget (Estimated)</td><td>${fmt(p.estimatedBudget)}</td></tr>
        <tr><td class="fin-label">Allocated Budget (Approved)</td><td>${fmt(p.allocatedBudget)}</td></tr>
        <tr><td class="fin-label">Spent to Date</td><td>${fmt(p.spentBudget)}</td></tr>
        <tr><td class="fin-label">Remaining Balance</td><td class="${remaining >= 0 ? 'highlight' : 'warning'}">${fmt(remaining)}</td></tr>
        <tr><td class="fin-label">Budget Utilization</td><td>${utilRate}%</td></tr>
        <tr><td class="fin-label">Budget Lock Status</td><td>${p.isBudgetLocked ? 'LOCKED & VERIFIED' : 'PROVISIONAL'}</td></tr>
    </table>

    ${p.progressPhotos?.length > 0 ? `
    <div class="section-title">Progress Photo Log (${p.progressPhotos.length} photos)</div>
    <table>
        <tr><th>#</th><th>Description</th><th>Uploaded On</th></tr>
        ${photos}
    </table>
    ` : ''}

    <div class="footer">
        BBMP | UrbanHelixX Civic Audit System | Blockchain Verified Report<br/>
        This is an auto-generated document. For official use, contact BBMP South Zone Office.
    </div>

    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

            const win = window.open('', '_blank');
            win.document.write(html);
            win.document.close();

        } catch (e) {
            console.error('Report Error:', e);
            alert('Error loading project data: ' + (e.response?.data?.message || e.message));
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading projects...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Projects</h1>
                <p className="page-subtitle">Municipal infrastructure projects lifecycle</p>
            </div>

            {user?.role === 'contractor' ? (
                <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Access Assigned Project</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                        Please enter the unique Project Code provided by the BBMP Engineer to view and manage your assigned project.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', maxWidth: '400px', margin: '0 auto' }}>
                        <input 
                            className="form-input" 
                            placeholder="e.g., UHX-A1B2C" 
                            value={searchInput} 
                            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                            style={{ flex: 1, textTransform: 'uppercase' }}
                        />
                        <button className="btn btn-primary" onClick={() => setFilter({ ...filter, projectCode: searchInput })}>Search Project</button>
                    </div>
                </div>
            ) : (
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
                    <select className="form-select" style={{ width: 'auto' }} value={filter.wardNo} onChange={(e) => setFilter({ ...filter, wardNo: e.target.value, area: '' })}>
                        <option value="">All Wards</option>
                        {wards.map(w => <option key={w._id} value={w.wardNo}>Ward {w.wardNo}: {w.name}</option>)}
                    </select>
                    {filter.wardNo && (
                        <select className="form-select" style={{ width: 'auto' }} value={filter.area} onChange={(e) => setFilter({ ...filter, area: e.target.value })}>
                            <option value="">All Areas</option>
                            {(wards.find(w => w.wardNo === parseInt(filter.wardNo))?.areas || []).map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    )}
                    <button className="btn btn-outline" onClick={() => setShowWardDir(true)}>📂 Ward Directory</button>
                    {user?.role === 'engineer' && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Proposal</button>
                    )}
                </div>
            )}

            <div className="projects-categorized">
                {['road', 'drainage', 'water_supply', 'sanitation', 'electricity', 'park', 'bridge', 'building', 'other']
                    .filter(cat => !filter.category || filter.category === cat)
                    .map(cat => {
                        const catProjects = projects.filter(p => (p.category || 'other') === cat);
                        if (catProjects.length === 0 && filter.category !== cat) return null;

                        return (
                            <div key={cat} className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                                <div className="section-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 className="section-title" style={{ color: 'var(--accent-red)', textTransform: 'capitalize', margin: 0 }}>
                                        {cat.replace('_', ' ')} Projects
                                    </h3>
                                    <span className="badge badge-pending">{catProjects.length} Items</span>
                                </div>

                                {catProjects.length > 0 ? (
                                    <div className="table-container" style={{ border: 'none' }}>
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Project</th>
                                                    <th>Ward</th>
                                                    <th>Area</th>
                                                    <th>Status</th>
                                                    {user?.role !== 'citizen' && (
                                                        <>
                                                            <th>Proposed Budget</th>
                                                            <th>Contractor</th>
                                                            <th>Engineer</th>
                                                            <th>Allocated Budget</th>
                                                            <th>Spent</th>
                                                            <th>Priority</th>
                                                        </>
                                                    )}
                                                    <th>Report</th>
                                                    {['engineer', 'admin', 'contractor', 'financial_officer'].includes(user?.role) && <th>Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {catProjects.map((p) => (
                                                    <tr key={p._id}>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                                {p.imageUrl && <img src={`http://localhost:5000${p.imageUrl}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />}
                                                                <div>
                                                                    <Link to={`/projects/${p._id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>
                                                                        {p.title}
                                                                    </Link>
                                                                    {['engineer', 'admin', 'financial_officer'].includes(user?.role) && p.projectCode && (
                                                                        <div style={{ fontSize: '14px', color: '#ff3b3b', fontWeight: 900, marginTop: '6px', background: 'rgba(255,59,59,0.1)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                                                            🔑 CODE: {p.projectCode}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: '13px' }}>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Ward {p.location?.wardNo}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.location?.ward}</div>
                                                        </td>
                                                        <td style={{ fontSize: '13px' }}>{p.location?.area}</td>
                                                        <td>
                                                            <span className={`status-badge ${p.status}`}>{p.status.replace('_', ' ')}</span>
                                                        </td>
                                                        {user?.role !== 'citizen' && (
                                                            <>
                                                                <td style={{ fontWeight: 600, color: '#475569' }}>{formatCurrency(p.estimatedBudget)}</td>
                                                                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.contractor?.name || 'Not Assigned'}</td>
                                                                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{p.engineer?.name || 'Not Assigned'}</td>
                                                                <td style={{ fontWeight: 700, color: '#2563eb' }}>{formatCurrency(p.allocatedBudget)}</td>
                                                                <td style={{ fontWeight: 700, color: '#b91c1c' }}>{formatCurrency(p.spentBudget)}</td>
                                                                <td><span className={`badge badge-${p.priority === 'critical' ? 'rejected' : p.priority === 'high' ? 'proposed' : 'completed'}`}>{p.priority}</span></td>
                                                            </>
                                                        )}
                                                        <td>
                                                            <button 
                                                                className="btn btn-outline btn-sm" 
                                                                style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                onClick={() => downloadProjectReport(p._id, p.title)}
                                                            >
                                                                <FiDownload /> PDF
                                                            </button>
                                                        </td>
                                                        {(['engineer', 'admin', 'financial_officer'].includes(user?.role) || (user?.role === 'contractor' && p.contractor?._id === user?._id)) && (
                                                            <td>
                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                    {user?.role === 'financial_officer' && p.status === 'proposed' && (
                                                                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(p._id, p.estimatedBudget)}>Approve</button>
                                                                    )}
                                                                    {['engineer', 'admin'].includes(user?.role) && p.status === 'approved' && !p.contractor && (
                                                                        <button className="btn btn-primary btn-sm" onClick={() => openAssign(p)}>Assign</button>
                                                                    )}
                                                                    {(['engineer', 'admin'].includes(user?.role) || (user?.role === 'contractor' && p.contractor?._id === user?._id)) &&
                                                                        ['approved', 'in_progress', 'verification'].includes(p.status) && (
                                                                            <>
                                                                                <button className="btn btn-outline btn-sm" onClick={() => handleUpdateStatus(p._id)}>Status</button>
                                                                                {user?.role === 'contractor' && p.projectCode && (
                                                                                    <Link 
                                                                                        to={`/expenses?code=${p.projectCode}`} 
                                                                                        className="btn btn-primary btn-sm"
                                                                                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                                    >
                                                                                        💰 Log Expense
                                                                                    </Link>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="glass-card" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                        No projects in this category
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* Create Project Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Submit Project Proposal</h3>
                        <form onSubmit={handleSubmit}>
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
                                    <label className="form-label">Estimated Budget (₹)</label>
                                    <input className="form-input" type="number" value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm Budget (₹)</label>
                                    <input className="form-input" type="number" value={form.enteredBudget} onChange={(e) => setForm({ ...form, enteredBudget: e.target.value })} required />
                                </div>
                            </div>


                            <div className="form-group">
                                <label className="form-label">Budget Estimation Proof</label>
                                <input type="file" className="form-input" accept="image/*" onChange={(e) => setBudgetProof(e.target.files[0])} required />
                            </div>

                            <div className="ward-area-section" style={{ 
                                background: '#f8fafc', 
                                padding: '20px', 
                                borderRadius: '12px', 
                                border: '1px solid #e2e8f0',
                                marginBottom: '24px'
                            }}>
                                <div className="grid-2" style={{ gap: '24px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#1e293b' }}>1. Select Ward</label>
                                        <div style={{ 
                                            maxHeight: '200px', 
                                            overflowY: 'auto', 
                                            background: '#ffffff', 
                                            borderRadius: '10px', 
                                            border: '1px solid #e2e8f0',
                                            padding: '12px',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                                        }}>
                                            {/* Search box inside the list for quick filtering */}
                                            <input 
                                                className="form-input" 
                                                placeholder="🔍 Filter wards..." 
                                                value={wardSearch} 
                                                onChange={(e) => setWardSearch(e.target.value)}
                                                style={{ marginBottom: '12px', height: '34px', fontSize: '13px', background: '#f8fafc' }}
                                            />
                                            {Array.from(new Set(wards.map(w => w.assemblyConstituency || 'Unknown AC'))).map(ac => {
                                                const acWards = wards.filter(w => 
                                                    (w.assemblyConstituency || 'Unknown AC') === ac && 
                                                    ((w.name || '').toLowerCase().includes((wardSearch || '').toLowerCase()) || 
                                                     (w.wardNo || '').toString().includes(wardSearch || ''))
                                                );
                                                if (acWards.length === 0) return null;
                                                return (
                                                    <div key={ac} style={{ marginBottom: '16px' }}>
                                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>{ac}</div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                                                            {acWards.map(w => (
                                                                <div 
                                                                    key={w._id} 
                                                                    className="ward-select-item"
                                                                    style={{ 
                                                                        padding: '8px 12px', 
                                                                        cursor: 'pointer', 
                                                                        borderRadius: '6px',
                                                                        fontSize: '13px',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        transition: 'all 0.2s ease',
                                                                        background: form.location.wardNo === w.wardNo ? '#eff6ff' : 'transparent',
                                                                        color: form.location.wardNo === w.wardNo ? '#2563eb' : '#475569',
                                                                        border: form.location.wardNo === w.wardNo ? '1px solid #dbeafe' : '1px solid transparent'
                                                                    }}
                                                                    onClick={() => {
                                                                        setForm({ ...form, location: { ...form.location, ward: w.name, wardNo: w.wardNo, area: '' } });
                                                                    }}
                                                                >
                                                                    <span style={{ fontWeight: form.location.wardNo === w.wardNo ? 600 : 400 }}>{w.name}</span>
                                                                    <span style={{ fontSize: '11px', opacity: 0.7 }}>#{w.wardNo}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, color: '#1e293b' }}>2. Select Area / Locality</label>
                                        {!form.location.ward ? (
                                            <div style={{ 
                                                height: '100px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: '#ffffff', 
                                                borderRadius: '10px', 
                                                border: '1px dashed #cbd5e1',
                                                fontSize: '12px',
                                                color: '#94a3b8',
                                                padding: '0 20px',
                                                textAlign: 'center'
                                            }}>
                                                Select a ward on the left to see constituent areas
                                            </div>
                                        ) : (
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                                                gap: '8px', 
                                                padding: '4px', 
                                                maxHeight: '180px',
                                                overflowY: 'auto'
                                            }}>
                                                {(wards.find(w => w.wardNo === form.location.wardNo)?.areas || []).map(a => (
                                                    <div 
                                                        key={a} 
                                                        onClick={() => setForm({ ...form, location: { ...form.location, area: a } })}
                                                        style={{ 
                                                            padding: '8px 10px', 
                                                            borderRadius: '8px', 
                                                            fontSize: '11px', 
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            fontWeight: 600,
                                                            background: form.location.area === a ? '#2563eb' : '#ffffff',
                                                            color: form.location.area === a ? '#ffffff' : '#64748b',
                                                            border: '1px solid',
                                                            borderColor: form.location.area === a ? '#2563eb' : '#e2e8f0',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        {a}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {form.location.area && (
                                    <div style={{ 
                                        marginTop: '16px', 
                                        padding: '8px 12px', 
                                        background: '#dcfce7', 
                                        borderRadius: '6px', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        fontSize: '12px',
                                        color: '#166534',
                                        fontWeight: 700,
                                        border: '1px solid #bbf7d0'
                                    }}>
                                        📍 Selected: {form.location.ward} ({form.location.area})
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Specific Location / Landmark</label>
                                <input className="form-input" value={form.location.address} onChange={(e) => setForm({ ...form, location: { ...form.location, address: e.target.value } })} placeholder="e.g., Near Gali Anjenaya Temple" />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" className="btn btn-primary">Submit Proposal</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Revision Modal */}
            {showRevisionModal && (
                <div className="modal-overlay" onClick={() => setShowRevisionModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Revise Project Budget</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Revision for: <strong>{selectedProject?.title}</strong></p>
                        <form onSubmit={handleRevision}>
                            <div className="form-group">
                                <label className="form-label">New Total Budget (₹)</label>
                                <input className="form-input" type="number" value={revisionForm.newBudget} onChange={(e) => setRevisionForm({ ...revisionForm, newBudget: e.target.value })} required />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Current: {formatCurrency(selectedProject?.allocatedBudget || selectedProject?.estimatedBudget)}</p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reason for Revision</label>
                                <textarea className="form-textarea" value={revisionForm.reason} onChange={(e) => setRevisionForm({ ...revisionForm, reason: e.target.value })} placeholder="Explain why more funds are required..." required />
                            </div>
                            <div className="alert alert-warning" style={{ fontSize: '12px', marginBottom: '16px' }}>
                                ⚠️ This revision will be recorded in the tamper-evident hash chain and blockchain history.
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="btn btn-primary">Authorize Revision</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowRevisionModal(false)}>Cancel</button>
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

            {/* Ward Directory Modal */}
            {showWardDir && (
                <div className="modal-overlay" onClick={() => setShowWardDir(false)}>
                    <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">South Zone Ward Directory</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>List of wards and their constituent areas</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', maxHeight: '60vh', overflowY: 'auto', padding: '4px' }}>
                            {wards.map(w => (
                                <div key={w._id} className="glass-card" style={{ padding: '16px' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', pb: '4px' }}>
                                        <span style={{ background: 'var(--accent-blue)', color: 'white', padding: '1px 6px', borderRadius: '4px', marginRight: '8px', fontSize: '12px' }}>{w.wardNo}</span>
                                        {w.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        AC: {w.assemblyConstituency}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {(w.areas || []).map(a => (
                                            <span key={a} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button className="btn btn-primary" onClick={() => setShowWardDir(false)}>Close Directory</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
