import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectAPI, milestoneAPI, auditAPI, authAPI } from '../services/api';
import { FiMapPin, FiClock, FiShield, FiFileText, FiImage, FiTrendingUp, FiActivity, FiDollarSign } from 'react-icons/fi';
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
    const [progressFile, setProgressFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [isTampered, setIsTampered] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        invoiceDate: new Date().toISOString().split('T')[0],
        amount: '', material: '', vendor: '', remarks: '',
        invoice: null, progressPhoto: null,
        gpsLat: '', gpsLng: ''
    });

    const CATEGORY_MATERIALS = {
        road: ['Asphalt/Bitumen','Gravel/Crushed Stone','Concrete','Sand','Cement','Steel Rebar','Labour/Wages','Machinery Rental'],
        water_supply: ['PVC/HDPE Pipes','Valves/Fittings','Pumps/Motors','Cement','Sand','Labour/Wages','Excavator Rental'],
        sanitation: ['Concrete Pipes','Manhole Covers','Cement','Sand','Bricks','Labour/Wages'],
        electricity: ['Cables/Wires','Transformers','Poles','Streetlights/LEDs','Switchgears','Labour/Wages'],
        park: ['Plants/Trees','Soil/Fertilizer','Paving Stones','Fencing/Gates','Benches/Play Equipment','Lighting','Labour/Wages'],
        building: ['Cement','Steel Rebar','Bricks/Blocks','Sand','Gravel','Wood/Plywood','Glass/Windows','Labour/Wages'],
        bridge: ['Steel Girders','Concrete','High-grade Cement','Cables','Scaffolding','Labour/Wages','Heavy Machinery'],
        drainage: ['Concrete Pipes','Cement','Sand','Steel Grates','Bricks','Labour/Wages','Excavator Rental'],
        other: ['General Materials','Labour/Wages','Machinery','Miscellaneous']
    };

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        try {
            const [projRes, msRes] = await Promise.all([
                projectAPI.getById(id),
                milestoneAPI.getAll({ project: id }),
            ]);
            setProject(projRes.data.project);
            setIsTampered(projRes.data.isTampered || false);
            setMilestones(msRes.data.milestones || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleApprove = async () => {
        try {
            await projectAPI.approve(id, { allocatedBudget: Number(project.estimatedBudget), remarks: 'Approved from details' });
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
        if (progressFile) formData.append('progressPhoto', progressFile);

        try {
            await projectAPI.updateStatus(id, formData);
            setReportFile(null);
            setProgressFile(null);
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error updating status'); }
    };

    const formatCurrency = (amt) => {
        if (!amt) return '₹0';
        if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    const captureGPS = () => {
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setExpenseForm(f => ({ ...f, gpsLat: pos.coords.latitude.toFixed(6), gpsLng: pos.coords.longitude.toFixed(6) }));
                setGpsLoading(false);
            },
            () => { alert('Could not get GPS location. Please enable location access.'); setGpsLoading(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleVerifyExpense = async (expId, verified) => {
        const remarks = verified ? 'Physically verified at site' : prompt('Reason for rejection:') || 'Rejected';
        try {
            await projectAPI.verifyExpenditure(id, expId, { verified, remarks });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleLogExpense = async (e) => {
        e.preventDefault();
        if (expenseForm.date !== expenseForm.invoiceDate) {
            alert('CRITICAL: Expenditure date must exactly match the invoice date!');
            return;
        }
        if (!expenseForm.invoice) { alert('Invoice/bill upload is mandatory!'); return; }
        if (!expenseForm.progressPhoto) { alert('Geo-tagged progress photo is mandatory!'); return; }
        if (!expenseForm.gpsLat || !expenseForm.gpsLng) { alert('GPS location is required. Click "Capture GPS" first.'); return; }

        const remaining = (project.allocatedBudget || project.estimatedBudget) - project.spentBudget;
        if (Number(expenseForm.amount) > remaining) {
            alert(`Amount ₹${Number(expenseForm.amount).toLocaleString()} exceeds remaining budget ₹${remaining.toLocaleString()}!`);
            return;
        }

        const formData = new FormData();
        formData.append('date', expenseForm.date);
        formData.append('invoiceDate', expenseForm.invoiceDate);
        formData.append('amount', expenseForm.amount);
        formData.append('material', expenseForm.material);
        formData.append('vendor', expenseForm.vendor);
        formData.append('remarks', expenseForm.remarks);
        formData.append('gpsLat', expenseForm.gpsLat);
        formData.append('gpsLng', expenseForm.gpsLng);
        formData.append('invoice', expenseForm.invoice);
        formData.append('progressPhoto', expenseForm.progressPhoto);

        try {
            await projectAPI.logExpenditure(id, formData);
            setShowExpenseModal(false);
            setExpenseForm({ date: new Date().toISOString().split('T')[0], invoiceDate: new Date().toISOString().split('T')[0], amount: '', material: '', vendor: '', remarks: '', invoice: null, progressPhoto: null, gpsLat: '', gpsLng: '' });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error logging expense'); }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;
    if (!project) return <div className="empty-state">Project not found</div>;

    const progress = project.allocatedBudget > 0 ? Math.round((project.spentBudget / project.allocatedBudget) * 100) : 0;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="badge badge-pending" style={{ fontSize: '10px' }}>ID: {project._id.substring(0, 8).toUpperCase()}</span>
                        {['engineer', 'admin', 'financial_officer'].includes(user?.role) && project.projectCode && (
                            <span className="badge" style={{ fontSize: '14px', background: 'rgba(255,59,59,0.1)', color: '#ff3b3b', fontWeight: 900, border: '1px solid #ff3b3b' }}>🔑 CODE: {project.projectCode}</span>
                        )}
                        <span className="tx-tag">⛓️ Verified on Blockchain</span>
                    </div>
                    <h1 className="page-title">{project.title}</h1>
                    <p className="page-subtitle"><FiMapPin /> {project.location?.address}, Ward {project.location?.wardNo}: {project.location?.ward} • {project.category?.replace('_', ' ')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Status</div>
                    <span className={`status-badge ${project.status}`} style={{ fontSize: '14px', padding: '6px 16px' }}>{project.status?.replace('_', ' ')}</span>
                </div>
            </div>
            
            {isTampered && (
                <div className="glass-card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', marginBottom: '20px', padding: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }}>
                        <span style={{ fontSize: '24px' }}>🚨</span>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>TAMPER DETECTED: AUDIT FAILED</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                                The cryptographic hashes for this project's expenditures do not match the original records. 
                                This project has been flagged for immediate investigation by Citizens and the Administration.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Prominent Assign Contractor Banner for Engineers */}
            {['engineer', 'admin'].includes(user?.role) && project.status === 'approved' && !project.contractor && (
                <div className="glass-card" style={{ marginBottom: '20px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(16,185,129,0.1))', border: '2px solid rgba(59,130,246,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '36px' }}>👷</span>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text-primary)', marginBottom: '4px' }}>Action Required: Assign a Contractor</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>This project has been approved by Finance. Please assign a contractor to begin execution.</div>
                            <div style={{ fontSize: '12px', color: 'var(--accent-blue)', marginTop: '4px', fontWeight: 600 }}>
                                🔑 Project Code: <span style={{ letterSpacing: '1px' }}>{project.projectCode}</span> — Share this with the assigned contractor.
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={openAssign} style={{ fontWeight: 800, fontSize: '15px', padding: '12px 28px', whiteSpace: 'nowrap' }}>
                        👷 Assign Contractor
                    </button>
                </div>
            )}

            {/* Quick Actions Bar */}
            {(['engineer', 'admin', 'financial_officer'].includes(user?.role) || (user?.role === 'contractor' && project.contractor?._id === user?._id)) && (
                <div className="glass-card" style={{ marginBottom: '20px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>ACTIONS:</span>
                    {user?.role === 'financial_officer' && project.status === 'proposed' && (
                        <button className="btn btn-success btn-sm" onClick={handleApprove}>Approve Project</button>
                    )}
                    {['engineer', 'admin'].includes(user?.role) && ['approved', 'in_progress'].includes(project.status) && !project.contractor && (
                        <button className="btn btn-primary" onClick={openAssign} style={{ fontWeight: 700, fontSize: '14px', padding: '8px 20px' }}>👷 Assign Contractor</button>
                    )}
                    {['engineer', 'admin'].includes(user?.role) && project.status === 'approved' && project.contractor && (
                        <button className="btn btn-outline btn-sm" onClick={openAssign}>🔄 Reassign Contractor</button>
                    )}
                    {(['engineer', 'admin'].includes(user?.role) || (user?.role === 'contractor' && project.contractor?._id === user?._id)) &&
                        ['approved', 'in_progress', 'verification'].includes(project.status) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '10px', marginBottom: 0 }}>Progress Photo</label>
                                    <input type="file" onChange={(e) => setProgressFile(e.target.files[0])} style={{ fontSize: '11px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '10px', marginBottom: 0 }}>Bill / Report PDF</label>
                                    <input type="file" onChange={(e) => setReportFile(e.target.files[0])} style={{ fontSize: '11px' }} />
                                </div>
                                <button className="btn btn-outline btn-sm" onClick={handleUpdateStatus}>Update Progress</button>
                                {user?.role === 'contractor' && (
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowExpenseModal(true)}>
                                        <FiDollarSign /> Log Material Expense
                                    </button>
                                )}
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
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{project.location?.address}, Ward {project.location?.wardNo}: {project.location?.ward}</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiDollarSign style={{ color: 'var(--accent-blue)' }} /> Budget & Revisions
                    </h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Original Estimated Budget</span>
                                <span style={{ fontSize: '15px', fontWeight: 700 }}>{formatCurrency(project.estimatedBudget)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Allocated (Revised) Budget</span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(project.allocatedBudget || project.estimatedBudget)}</span>
                            </div>
                        </div>
                        
                        {project.budgetRevisionHistory?.length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Revision History</div>
                                {project.budgetRevisionHistory.map((rev, idx) => (
                                    <div key={idx} style={{ fontSize: '12px', borderLeft: '2px solid var(--accent-orange)', paddingLeft: '10px', marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 600 }}>Revise to {formatCurrency(rev.newBudget)}</div>
                                        <div style={{ color: 'var(--text-muted)' }}>{rev.reason}</div>
                                        <div style={{ fontSize: '10px', opacity: 0.7 }}>{new Date(rev.timestamp).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            {project.budgetEstimateProofUrl && (
                                <a href={`${project.budgetEstimateProofUrl}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                                    <FiImage /> View Budget Proof
                                </a>
                            )}
                            {project.reportUrl && (
                                <a href={`${project.reportUrl}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                                    <FiFileText /> View Bill / Report
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenditures List */}
            {project.expenditures && project.expenditures.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title"><FiDollarSign style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Material Expenses — Contractor Submissions</h2>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr><th>Date</th><th>Material</th><th>Vendor</th><th>Amount</th><th>Invoice</th><th>Site Photo & GPS</th><th>Hash</th><th>Engineer Verification</th></tr>
                            </thead>
                            <tbody>
                                {project.expenditures.sort((a, b) => new Date(b.date) - new Date(a.date)).map((exp) => (
                                    <tr key={exp._id}>
                                        <td style={{ fontSize: '13px' }}>{new Date(exp.date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 500 }}>{exp.material}</td>
                                        <td style={{ fontSize: '13px' }}>{exp.vendor}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{formatCurrency(exp.amount)}</td>
                                        <td>
                                            <a href={exp.invoiceUrl} target="_blank" rel="noreferrer" className="tx-tag" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', textDecoration: 'none' }}>📄 Bill</a>
                                        </td>
                                        <td>
                                            {exp.progressPhotoUrl && <a href={exp.progressPhotoUrl} target="_blank" rel="noreferrer" className="tx-tag" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', textDecoration: 'none', marginRight: '4px' }}>📸 Photo</a>}
                                            {exp.gpsLat && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>📍 {parseFloat(exp.gpsLat).toFixed(4)},{parseFloat(exp.gpsLng).toFixed(4)}</span>}
                                        </td>
                                        <td><span className="tx-tag" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', fontSize: '10px' }}>🔒 SHA-256</span></td>
                                        <td>
                                            {exp.engineerVerified ? (
                                                <span className="tx-tag" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>✅ Verified<br/><span style={{ fontSize: '10px' }}>{exp.verificationRemarks}</span></span>
                                            ) : (
                                                ['engineer', 'admin'].includes(user?.role) ? (
                                                    <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>⏳ Pending physical verification</span>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button className="btn btn-success btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => handleVerifyExpense(exp._id, true)}>✅ Verify</button>
                                                            <button className="btn btn-outline btn-sm" style={{ fontSize: '11px', padding: '3px 8px', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleVerifyExpense(exp._id, false)}>❌ Reject</button>
                                                        </div>
                                                    </div>
                                                ) : <span style={{ fontSize: '11px', color: 'var(--accent-orange)' }}>⏳ Awaiting Engineer</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="glass-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Visual Evidence</h3>
                    {project.imageUrl ? (
                        <img src={`${project.imageUrl}`} alt="Project" style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--glass-border)' }} />
                    ) : (
                        <div style={{ height: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                            No visual uploads yet
                        </div>
                    )}
                </div>
            </div>
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title"><FiImage style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Construction Visual Proof (Before & After)</h2>
                </div>
                <div className="grid-3" style={{ gap: '16px' }}>
                    {/* Before Image (Original) */}
                    <div className="glass-card" style={{ padding: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>Original Condition (Before)</div>
                        {project.imageUrl ? (
                            <img src={`${project.imageUrl}`} alt="Before" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                        ) : (
                            <div style={{ height: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No before photo</div>
                        )}
                    </div>

                    {/* Progress Photos */}
                    {(project.progressPhotos || []).map((photo, idx) => (
                        <div key={idx} className="glass-card" style={{ padding: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>Progress {idx + 1}</div>
                            <img src={`${photo.url}`} alt={`Progress ${idx}`} style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                            <div style={{ fontSize: '11px', marginTop: '6px', color: 'var(--text-secondary)' }}>{photo.description}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{new Date(photo.timestamp).toLocaleDateString()}</div>
                        </div>
                    ))}

                    {/* Final Image (If completed) */}
                    {project.status === 'completed' && (
                        <div className="glass-card" style={{ padding: '12px', border: '1px solid var(--accent-green)' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', textAlign: 'center', color: 'var(--accent-green)' }}>Completed (After)</div>
                            {project.progressPhotos?.length > 0 ? (
                                <img src={`${project.progressPhotos[project.progressPhotos.length - 1].url}`} alt="After" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />
                            ) : (
                                <div style={{ height: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No final photo</div>
                            )}
                        </div>
                    )}
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

            {/* Activity Timeline */}
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title"><FiActivity style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Public Activity Timeline</h2>
                    <span className="badge badge-approved">Tamper-Proof History</span>
                </div>
                <div className="glass-card">
                    <div className="activity-timeline-container">
                        {[
                            ...(project.statusHistory || []).map(h => ({ ...h, type: 'status' })),
                            ...(project.budgetRevisionHistory || []).map(r => ({ 
                                status: 'budget_revised', 
                                remarks: `Budget revised from ${formatCurrency(r.oldBudget)} to ${formatCurrency(r.newBudget)}. Reason: ${r.reason}`, 
                                timestamp: r.timestamp,
                                type: 'revision',
                                transactionHash: r.transactionHash
                            }))
                        ]
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .map((item, idx) => (
                            <div key={idx} className="timeline-item">
                                <div className="timeline-marker">
                                    <div className={`timeline-dot ${item.type === 'revision' ? 'warning' : 'active'}`}></div>
                                    {idx < 100 && <div className="timeline-line"></div>}
                                </div>
                                <div className="timeline-content-detailed">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <span className={`badge badge-${item.status === 'budget_revised' ? 'proposed' : item.status}`} style={{ marginBottom: '6px' }}>
                                                {item.status?.replace('_', ' ')}
                                            </span>
                                            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>{item.remarks}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600 }}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(item.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    {item.transactionHash && (
                                        <div className="tx-tag" style={{ marginTop: '8px' }}>🔗 Proof Hash: {item.transactionHash.substring(0, 24)}...</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transparency Section */}
            <div className="section">
                <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05))', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ fontSize: '40px' }}>🛡️</div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Transparency Verified by Hashing</h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                This project's history is secured using cryptographic hashing. Every update creates a unique digital fingerprint 
                                that cannot be secretly changed. The current project state is verified against the last recorded hash on the blockchain.
                            </p>
                            {project.lastTransactionHash && (
                                <div style={{ marginTop: '12px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent-green)', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                                    LATEST PROOF HASH: {project.lastTransactionHash}
                                </div>
                            )}
                        </div>
                    </div>
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

            {/* Log Expense Modal for Contractor */}
            {showExpenseModal && (
                <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 className="modal-title">📋 Log Material Expense</h3>
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--accent-red)' }}>
                            ⚠️ All entries are SHA-256 hashed and tamper-proof. Engineer must physically verify before payment is released.
                        </div>

                        {/* Remaining Budget Banner */}
                        <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '8px', padding: '8px 14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Remaining Budget</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency((project.allocatedBudget || project.estimatedBudget) - project.spentBudget)}</span>
                        </div>

                        <form onSubmit={handleLogExpense}>
                            <div className="grid-2" style={{ gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Expenditure Date</label>
                                    <input className="form-input" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Invoice Date <span style={{ color: 'var(--accent-red)' }}>(Must Match!)</span></label>
                                    <input className="form-input" type="date" value={expenseForm.invoiceDate} onChange={(e) => setExpenseForm({ ...expenseForm, invoiceDate: e.target.value })} required />
                                </div>
                            </div>
                            {expenseForm.date !== expenseForm.invoiceDate && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '10px', fontWeight: 600 }}>⚠️ Date mismatch! Dates must be identical.</div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Material / Expense Type <span style={{ color: 'var(--accent-blue)', fontSize: '11px' }}>AI-Suggested for {project.category?.replace('_',' ')}</span></label>
                                <select className="form-select" value={expenseForm.material} onChange={(e) => setExpenseForm({ ...expenseForm, material: e.target.value })} required>
                                    <option value="">-- Select Material --</option>
                                    {(CATEGORY_MATERIALS[project.category] || CATEGORY_MATERIALS.other).map(mat => (
                                        <option key={mat} value={mat}>{mat}</option>
                                    ))}
                                </select>
                                <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Only approved materials for this project type are shown. Custom entries are blocked.</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Vendor / Supplier Name</label>
                                <input className="form-input" type="text" placeholder="e.g. Bharath Steels Ltd." value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount Spent (₹)</label>
                                <input className="form-input" type="number" min="1" max={(project.allocatedBudget || project.estimatedBudget) - project.spentBudget} value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
                                <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Max: ₹{((project.allocatedBudget || project.estimatedBudget) - project.spentBudget).toLocaleString()} remaining</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📄 Upload Official Invoice / Bill <span style={{ color: 'var(--accent-red)' }}>*Required</span></label>
                                <input className="form-input" type="file" accept="image/*,application/pdf" onChange={(e) => setExpenseForm({ ...expenseForm, invoice: e.target.files[0] })} required />
                                <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Bill date must match expenditure date. This will be SHA-256 hashed permanently.</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📸 Geo-tagged Site Photo <span style={{ color: 'var(--accent-red)' }}>*Required</span></label>
                                <input className="form-input" type="file" accept="image/*" capture="environment" onChange={(e) => setExpenseForm({ ...expenseForm, progressPhoto: e.target.files[0] })} required />
                                <small style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Take a photo at the work site. Photo location must match the ward.</small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">📍 GPS Location <span style={{ color: 'var(--accent-red)' }}>*Required</span></label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button type="button" className="btn btn-outline btn-sm" onClick={captureGPS} disabled={gpsLoading}>
                                        {gpsLoading ? '⏳ Getting GPS...' : '📍 Capture My GPS Location'}
                                    </button>
                                    {expenseForm.gpsLat && <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>✅ {expenseForm.gpsLat}, {expenseForm.gpsLng}</span>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Remarks (Optional)</label>
                                <input className="form-input" type="text" placeholder="Additional details..." value={expenseForm.remarks} onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" className="btn btn-primary" disabled={expenseForm.date !== expenseForm.invoiceDate || !expenseForm.gpsLat}>
                                    {expenseForm.date !== expenseForm.invoiceDate ? '⚠️ Fix Date Mismatch' : !expenseForm.gpsLat ? '📍 GPS Required' : '🔒 Lock & Submit Expense'}
                                </button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
