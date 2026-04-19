import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectAPI, milestoneAPI, auditAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProjectDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [reportFile, setReportFile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        try {
            const [projRes, msRes] = await Promise.all([
                projectAPI.getById(id),
                milestoneAPI.getAll({ project: id }),
            ]);
            setProject(projRes.data.project);
            setMilestones(msRes.data.milestones || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleApprove = async () => {
        const budget = prompt('Enter allocated budget amount:');
        if (!budget) return;
        try {
            await projectAPI.approve(id, { allocatedBudget: Number(budget), remarks: 'Approved from details' });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const openAssign = async () => {
        try {
            const res = await authAPI.getUsers('contractor');
            setContractors(res.data.users || []);
            setShowAssignModal(true);
        } catch (e) { }
    };

    const handleAssign = async (contractorId) => {
        try {
            await projectAPI.assign(id, {
                contractorId,
                startDate: new Date(),
                expectedEndDate: new Date(Date.now() + 180 * 86400000),
            });
            setShowAssignModal(false);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleUpdateStatus = async () => {
        const status = prompt('Enter new status (in_progress, verification, completed):');
        if (!status) return;
        const remarks = prompt('Remarks:');

        const formData = new FormData();
        formData.append('status', status);
        formData.append('remarks', remarks || '');
        if (reportFile) formData.append('report', reportFile);

        try {
            await projectAPI.updateStatus(id, formData);
            setReportFile(null);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error updating status'); }
    };

    const formatCurrency = (amt) => {
        if (!amt) return '₹0';
        if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;
    if (!project) return <div className="empty-state">Project not found</div>;

    const progress = project.allocatedBudget > 0 ? Math.round((project.spentBudget / project.allocatedBudget) * 100) : 0;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title" style={{ marginTop: '8px' }}>{project.title}</h1>
                <p className="page-subtitle">{project.category?.replace('_', ' ')} • {project.department?.name} • {project.location?.ward}</p>
            </div>

            {/* Quick Actions Bar */}
            {(['engineer', 'admin'].includes(user?.role) || (user?.role === 'contractor' && project.contractor?._id === user?._id)) && (
                <div className="glass-card" style={{ marginBottom: '20px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>ACTIONS:</span>
                    {['engineer', 'admin'].includes(user?.role) && project.status === 'proposed' && (
                        <button className="btn btn-success btn-sm" onClick={handleApprove}>Approve Project</button>
                    )}
                    {['engineer', 'admin'].includes(user?.role) && project.status === 'approved' && !project.contractor && (
                        <button className="btn btn-primary btn-sm" onClick={openAssign}>Assign Contractor</button>
                    )}
                    {(['engineer', 'admin'].includes(user?.role) || (user?.role === 'contractor' && project.contractor?._id === user?._id)) &&
                        ['approved', 'in_progress', 'verification'].includes(project.status) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="file" onChange={(e) => setReportFile(e.target.files[0])} style={{ fontSize: '12px' }} />
                                <button className="btn btn-outline btn-sm" onClick={handleUpdateStatus}>Update Status</button>
                            </div>
                        )}
                    {user?.role === 'admin' && (
                        <button className="btn btn-outline btn-sm">Edit Details</button>
                    )}
                </div>
            )}

            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="glass-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Project Details</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px', lineHeight: 1.6 }}>{project.description}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</div>
                            <span className={`badge badge-${project.status}`}>{project.status?.replace('_', ' ')}</span>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</div>
                            <span className={`badge badge-${project.priority === 'critical' ? 'rejected' : 'proposed'}`}>{project.priority}</span>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Proposed By</div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{project.proposedBy?.name || '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Engineer</div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{project.engineer?.name || '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contractor</div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{project.contractor?.name || 'Not Assigned'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Location</div>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{project.location?.address}, Ward {project.location?.ward}</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Budget & Documentation</h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Estimated</span>
                                <span style={{ fontSize: '15px', fontWeight: 700 }}>{formatCurrency(project.estimatedBudget)}</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Allocated</span>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency(project.allocatedBudget)}</span>
                            </div>
                        </div>
                        {project.reportUrl && (
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Project Report</div>
                                <a href={`http://localhost:5000${project.reportUrl}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ width: '100%', textAlign: 'center' }}>Download PDF Report</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="glass-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Visual Evidence</h3>
                    {project.imageUrl ? (
                        <img src={`http://localhost:5000${project.imageUrl}`} alt="Project" style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--glass-border)' }} />
                    ) : (
                        <div style={{ height: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                            No visual uploads yet
                        </div>
                    )}
                </div>
                <div className="glass-card">
                    <h2 className="section-title" style={{ fontSize: '15px', marginBottom: '16px' }}>Project Progress</h2>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Spent ({progress}%)</span>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(project.spentBudget)}</span>
                        </div>
                        <div className="progress-bar">
                            <div className={`progress-bar-fill ${progress > 90 ? 'red' : progress > 60 ? 'blue' : 'green'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Timeline</div>
                        <div style={{ fontSize: '13px' }}>
                            <div>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</div>
                            <div>Expected End: {project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString() : '—'}</div>
                            {project.actualEndDate && <div style={{ color: 'var(--accent-green)' }}>Completed: {new Date(project.actualEndDate).toLocaleDateString()}</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Milestones */}
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Milestones</h2>
                </div>
                {milestones.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr><th>#</th><th>Milestone</th><th>Amount</th><th>Status</th><th>Engineer</th><th>Financial</th></tr>
                            </thead>
                            <tbody>
                                {milestones.map(m => (
                                    <tr key={m._id}>
                                        <td style={{ fontWeight: 600 }}>{m.milestoneNumber}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{m.title}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.description}</div>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(m.amount)}</td>
                                        <td><span className={`badge badge-${m.status}`}>{m.status?.replace('_', ' ')}</span></td>
                                        <td>{m.engineerApproval?.approved ? <span style={{ color: 'var(--accent-green)' }}>✓ Approved</span> : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}</td>
                                        <td>{m.financialApproval?.approved ? <span style={{ color: 'var(--accent-green)' }}>✓ Approved</span> : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : <div className="empty-state">No milestones added yet</div>}
            </div>

            {/* Status History */}
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Status History</h2>
                </div>
                <div className="hash-chain-list">
                    {(project.statusHistory || []).map((h, i) => (
                        <div key={i}>
                            <div className="hash-record">
                                <div className="hash-record-number">Step {i + 1}</div>
                                <div className="hash-record-type">
                                    <span className={`badge badge-${h.status}`}>{h.status?.replace('_', ' ')}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    {h.remarks} — <span style={{ color: 'var(--text-muted)' }}>{new Date(h.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {i < project.statusHistory.length - 1 && <div className="chain-connector"></div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Assign Contractor Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Assign Contractor</h3>
                        {contractors.map(c => (
                            <div key={c._id} className="glass-card" style={{ marginBottom: '8px', cursor: 'pointer', padding: '14px' }} onClick={() => handleAssign(c._id)}>
                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>
                            </div>
                        ))}
                        <button className="btn btn-outline btn-sm" style={{ marginTop: '10px', width: '100%' }} onClick={() => setShowAssignModal(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
