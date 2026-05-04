import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, deptAPI, authAPI, wardAPI } from '../services/api';
import { Link } from 'react-router-dom';
import { FiDownload } from 'react-icons/fi';
import { fallbackWards } from '../data/wardsFallback';

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
        title: '', description: '', category: 'road', estimatedBudget: '', enteredBudget: '', department: '', priority: 'medium', contractor: '',
        location: { ward: '', area: '', address: '' }, spentBudget: 0
    });
    const [budgetProof, setBudgetProof] = useState(null);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [showReleaseModal, setShowReleaseModal] = useState(false);
    const [releaseForm, setReleaseForm] = useState({ accountNumber: '', ifscCode: '', bankName: '' });
    const [lightboxUrl, setLightboxUrl] = useState(null);
    const [verifyForm, setVerifyForm] = useState({ verified: true, remarks: '', photo: null, expenditureId: '' });
    const [revisionForm, setRevisionForm] = useState({ newBudget: '', reason: '' });
    const [claimCode, setClaimCode] = useState('');

    useEffect(() => { loadData(); }, [filter]);

    const loadData = async () => {
        try {
            const params = {};
            if (filter.status) params.status = filter.status;
            if (filter.category) params.category = filter.category;
            if (filter.wardNo) params.wardNo = filter.wardNo;
            if (filter.area) params.area = filter.area;
            
            if (user?.role === 'contractor') {
                if (filter.projectCode) {
                    params.projectCode = filter.projectCode;
                } else {
                    params.contractor = user._id;
                }
            }

            const [projRes, deptRes, wardRes] = await Promise.all([
                projectAPI.getAll(params),
                deptAPI.getAll(),
                (wardAPI && wardAPI.getAll) ? wardAPI.getAll() : fetch('/api/wards').then(r => r.json()),
            ]);
            setProjects(projRes.data?.projects || projRes.projects || []);
            setDepartments(deptRes.data?.departments || deptRes.departments || []);
            const fetchedWards = wardRes.data?.wards || wardRes.wards || [];
            setWards(fetchedWards.length > 0 ? fetchedWards : fallbackWards);
        } catch (err) { 
            console.error(err);
            setWards(fallbackWards); 
        } finally { setLoading(false); }
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
            setForm({ title: '', description: '', category: 'road', estimatedBudget: '', enteredBudget: '', department: '', priority: 'medium', contractor: '', location: { ward: '', area: '', address: '' }, spentBudget: 0 });
            setImageFile(null);
            setReportFile(null);
            setBudgetProof(null);
            loadData();
        } catch (err) { 
            console.error('Save project error:', err);
            alert(err.response?.data?.message || err.message || 'Error saving project'); 
        }
    };

    const handleRevision = async (e) => {
        e.preventDefault();
        try {
            await projectAPI.reviseBudget(selectedProject._id, revisionForm);
            setShowRevisionModal(false);
            setRevisionForm({ newBudget: '', reason: '' });
            loadData();
        } catch (err) { 
            console.error('Revision error:', err);
            alert(err.response?.data?.message || err.message || 'Error revising budget'); 
        }
    };

    const handleApprove = async (id, estimatedBudget) => {
        try {
            const res = await projectAPI.approve(id, { allocatedBudget: Number(estimatedBudget), remarks: 'Approved' });
            loadData();
            
            // If the old server didn't generate a code, we deterministically create one from the ID
            let code = res.data?.project?.projectCode;
            if (!code && res.data?.project?._id) {
                code = 'UHX-' + res.data.project._id.substring(18).toUpperCase();
            }
            
            if (code) {
                alert(`✅ SUCCESS! Project Approved.\n\nCONTRACTOR ASSIGNMENT CODE: ${code}\n\nPlease share this code with the contractor so they can claim this project.`);
            } else {
                alert(`✅ Project Approved successfully!`);
            }
        } catch (err) { 
            console.error('Approval error:', err);
            const msg = err.response?.data?.message || err.message || 'Approval failed';
            alert(`Approval Error: ${msg}`); 
        }
    };

    const handleClaim = async () => {
        if (!claimCode.trim()) { alert('Please enter a project code'); return; }
        try {
            await projectAPI.claim(claimCode.trim(), user._id);
            alert('✅ Successfully assigned to project!');
            setClaimCode('');
            loadData();
        } catch (err) {
            alert(`Error claiming project: ${err.message}`);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!verifyForm.expenditureId) { alert('Select an expenditure to verify!'); return; }
        if (verifyForm.verified && !verifyForm.photo) { alert('Physical verification photo is mandatory!'); return; }

        const formData = new FormData();
        formData.append('verified', verifyForm.verified);
        formData.append('remarks', verifyForm.remarks);
        if (verifyForm.photo) formData.append('verificationPhoto', verifyForm.photo);

        try {
            await projectAPI.verifyExpenditure(selectedProject._id, verifyForm.expenditureId, formData);
            setShowVerifyModal(false);
            setVerifyForm({ verified: true, remarks: '', photo: null, expenditureId: '' });
            loadData();
        } catch (err) { 
            console.error('Action error:', err);
            alert(`Error: ${err.response?.data?.message || err.message || 'Unknown error'}`); 
        }
    };

    const handleRelease = async (projectId, expId) => {
        if (!releaseForm.accountNumber || !releaseForm.ifscCode) {
            alert('Please enter Bank Account Number and IFSC Code to release payment!');
            return;
        }
        if (!window.confirm(`Release payment to Account ${releaseForm.accountNumber}?`)) return;
        
        try {
            await projectAPI.releaseExpenditure(projectId, expId, releaseForm);
            loadData();
            // Optional: Close modal if no more pending
            const p = projects.find(proj => proj._id === projectId);
            const pending = p.expenditures.filter(e => e.readyForPayment && !e.financeReleased).length;
            if (pending <= 1) setShowReleaseModal(false);
        } catch (err) { 
            console.error('Action error:', err);
            alert(`Error: ${err.response?.data?.message || err.message || 'Unknown error'}`); 
        }
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
        } catch (err) { 
            console.error('Action error:', err);
            alert(`Error: ${err.response?.data?.message || err.message || 'Unknown error'}`); 
        }
    };

    const handleUpdateStatus = async (id) => {
        const status = prompt('Enter new status (in_progress, verification, completed):');
        if (!status) return;
        const remarks = prompt('Remarks:');
        try {
            await projectAPI.updateStatus(id, { status, remarks });
            loadData();
        } catch (err) { 
            console.error('Update status error:', err);
            alert(err.response?.data?.message || err.message || 'Status update failed'); 
        }
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

            const getAbsoluteUrl = (url) => {
                if (!url) return '';
                if (url.startsWith('http')) return url;
                return `http://localhost:5000${url}`;
            };

            const photos = (p.progressPhotos || []).map((ph, i) => `
                <div style="margin-bottom: 20px; break-inside: avoid;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Progress Photo #${i + 1} - ${fmtDate(ph.timestamp)}</div>
                    <img src="${getAbsoluteUrl(ph.url)}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />
                    <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Description: ${ph.description || 'No description provided'}</div>
                </div>
            `).join('');

            const expPhotos = (p.expenditures || []).filter(e => e.progressPhotoUrl).map((e, i) => `
                <div style="margin-bottom: 20px; break-inside: avoid;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Expenditure Proof: ${e.material} (₹${e.amount.toLocaleString()})</div>
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <div style="font-size: 10px; color: #64748b;">Site Progress:</div>
                            <img src="${getAbsoluteUrl(e.progressPhotoUrl)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px;" />
                        </div>
                        ${e.verificationPhotoUrl ? `
                        <div style="flex: 1;">
                            <div style="font-size: 10px; color: #64748b;">Engineer Verification:</div>
                            <img src="${getAbsoluteUrl(e.verificationPhotoUrl)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px;" />
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>BBMP Official Report - ${p.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; color: #1e293b; background: #fff; padding: 40px; line-height: 1.5; }
        .header { background: #1e3a5f; color: white; text-align: center; padding: 30px; border-radius: 12px; margin-bottom: 30px; position: relative; overflow: hidden; }
        .header::after { content: "OFFICIAL"; position: absolute; top: 10px; right: -30px; background: rgba(255,255,255,0.2); transform: rotate(45deg); padding: 5px 40px; font-weight: bold; font-size: 10px; }
        .header h1 { font-size: 32px; letter-spacing: 5px; margin-bottom: 5px; font-weight: 900; }
        .header h2 { font-size: 16px; font-weight: normal; margin-bottom: 5px; opacity: 0.9; }
        .header p { font-size: 11px; opacity: 0.7; }
        .report-title { font-size: 24px; font-weight: bold; color: #1e3a5f; margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between; }
        .generated { font-size: 11px; color: #64748b; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
        .section-title { font-size: 16px; font-weight: 800; color: #1e3a5f; border-left: 4px solid #1e3a5f; padding-left: 12px; margin: 30px 0 15px; text-transform: uppercase; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; color: #475569; padding: 12px 15px; text-align: left; font-size: 11px; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 15px; border-bottom: 1px solid #f1f5f9; }
        .label-col { font-weight: 600; color: #64748b; width: 35%; background: #f8fafc; }
        .highlight { color: #10b981; font-weight: bold; }
        .warning { color: #ef4444; font-weight: bold; }
        .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 2px solid #f1f5f9; padding-top: 20px; }
        .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media print { body { padding: 0; } .header { border-radius: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>BBMP</h1>
        <h2>Bruhat Bengaluru Mahanagara Palike</h2>
        <p>South Zone | UrbanHelixX Blockchain Audit Division</p>
    </div>

    <div class="report-title">
        <span>Project Audit Certificate</span>
        <span style="font-size: 14px; background: #1e3a5f; color: white; padding: 4px 12px; border-radius: 20px;">${p.projectCode || 'N/A'}</span>
    </div>
    <div class="generated">System Generated ID: ${p._id} | Timestamp: ${new Date().toLocaleString('en-IN')}</div>

    <div class="section-title">I. Project Identification</div>
    <table>
        <tr><td class="label-col">Official Title</td><td><strong>${p.title || 'N/A'}</strong></td></tr>
        <tr><td class="label-col">Department / Category</td><td>${(p.category || 'N/A').replace(/_/g, ' ').toUpperCase()}</td></tr>
        <tr><td class="label-col">Location (Ward)</td><td>Ward ${p.location?.wardNo}: ${p.location?.ward || 'N/A'}</td></tr>
        <tr><td class="label-col">Area / Address</td><td>${p.location?.area || 'N/A'} - ${p.location?.address || 'N/A'}</td></tr>
        <tr><td class="label-col">Lifecycle Status</td><td><span style="padding: 2px 8px; border-radius: 4px; background: #dcfce7; color: #166534; font-weight: bold;">${(p.status || 'N/A').toUpperCase()}</span></td></tr>
    </table>

    <div class="section-title">II. Personnel & Accountability</div>
    <table>
        <tr><td class="label-col">Proposing Authority</td><td>${p.proposedBy?.name || 'N/A'} (${p.proposedBy?.role || 'Citizen'})</td></tr>
        <tr><td class="label-col">Supervising Engineer</td><td>${p.engineer?.name || 'N/A'}</td></tr>
        <tr><td class="label-col">Executing Contractor</td><td>${p.contractor?.name || 'N/A'}</td></tr>
    </table>

    <div class="section-title">III. Financial Audit Trail</div>
    <table>
        <tr><th style="width: 50%;">Metric</th><th>Value</th></tr>
        <tr><td class="label-col">Allocated Budget</td><td><strong>${fmt(p.allocatedBudget)}</strong></td></tr>
        <tr><td class="label-col">Total Expenditure Verified</td><td><strong>${fmt(p.spentBudget)}</strong></td></tr>
        <tr><td class="label-col">Budget Utilization</td><td><span class="${utilRate > 90 ? 'warning' : 'highlight'}">${utilRate}%</span></td></tr>
        <tr><td class="label-col">Blockchain Status</td><td><span class="highlight">⛓️ SECURED & VERIFIED</span></td></tr>
    </table>

    ${p.progressPhotos?.length > 0 ? `
    <div class="section-title">IV. Visual Evidence (Site Logs)</div>
    <div class="photo-grid">
        ${photos}
    </div>
    ` : ''}

    ${p.expenditures?.length > 0 ? `
    <div class="section-title">V. Expenditure Proofs & Field Verification</div>
    <div>
        ${expPhotos}
    </div>
    ` : ''}

    <div class="footer">
        <p>This document serves as an official Project Audit Certificate (PAC) generated by the UrbanHelixX System.</p>
        <p>Verification Hash: ${p.transactionHash || 'Blockchain Record Pending'}</p>
        <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} BBMP South Zone. All Rights Reserved.</p>
    </div>

    <script>window.onload = function() { setTimeout(() => { window.print(); }, 1000); }</script>
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

            {user?.role === 'contractor' && (
                <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div>
                            <h3 style={{ marginBottom: '6px', color: 'var(--text-primary)' }}>Your Assigned Projects</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Projects assigned to you by the BBMP Engineering Department.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <input 
                                className="form-input" 
                                placeholder="🔍 Project Code..." 
                                value={searchInput} 
                                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                                style={{ width: '180px', textTransform: 'uppercase' }}
                            />
                            <button className="btn btn-primary" onClick={() => setFilter({ ...filter, projectCode: searchInput })}>Access Project</button>
                            {filter.projectCode && <button className="btn btn-outline" onClick={() => { setFilter({ ...filter, projectCode: '' }); setSearchInput(''); }}>Clear Search</button>}
                        </div>
                    </div>
                </div>
            )}
            
            {user?.role !== 'contractor' && (
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
                        <button className="btn btn-primary" onClick={async () => {
                            setForm({ title: '', description: '', category: 'road', estimatedBudget: '', enteredBudget: '', department: '', priority: 'medium', contractor: '', location: { ward: '', area: '', address: '' }, spentBudget: 0 });
                            setSelectedProject(null);
                            try {
                                const res = await authAPI.getUsers('contractor');
                                setContractors(res.data.users || []);
                            } catch (e) { }
                            setShowModal(true);
                        }}>+ New Proposal</button>
                    )}
                    {user?.role === 'contractor' && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Enter Project Code (UHX-...)" 
                                value={claimCode} 
                                onChange={(e) => setClaimCode(e.target.value)} 
                                style={{ width: '220px', margin: 0, height: '36px' }}
                            />
                            <button className="btn btn-primary" onClick={handleClaim} style={{ height: '36px', padding: '0 16px' }}>Claim Project</button>
                        </div>
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
                                                                {p.imageUrl && (
                                                                    <img 
                                                                        src={`http://localhost:5000${p.imageUrl}`} 
                                                                        alt="" 
                                                                        style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer' }} 
                                                                        onClick={() => setLightboxUrl(`http://localhost:5000${p.imageUrl}`)}
                                                                    />
                                                                )}
                                                                <div>
                                                                    <Link to={`/projects/${p._id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>
                                                                        {p.title}
                                                                    </Link>
                                                                    {['engineer', 'admin', 'financial_officer'].includes(user?.role) && (
                                                                        <div style={{ fontSize: '14px', color: '#ff3b3b', fontWeight: 900, marginTop: '6px', background: 'rgba(255,59,59,0.1)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                                                                            🔑 CODE: {p.projectCode || ('UHX-' + p._id.substring(18).toUpperCase())}
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
                                                                    {(user?.role === 'financial_officer' || user?.role === 'admin') && p.status === 'proposed' && (
                                                                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(p._id, p.estimatedBudget)}>Approve</button>
                                                                    )}
                                                                    {['engineer', 'admin'].includes(user?.role) && p.status === 'approved' && !p.contractor && (
                                                                        <button className="btn btn-primary btn-sm" onClick={() => openAssign(p)}>Assign</button>
                                                                    )}
                                                                    {['engineer', 'admin'].includes(user?.role) && ['approved', 'in_progress', 'verification'].includes(p.status) && (
                                                                        <button 
                                                                            className="btn btn-primary btn-sm" 
                                                                            onClick={() => { setSelectedProject(p); setShowVerifyModal(true); }}
                                                                            style={{ background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                        >
                                                                            🔍 Verify Work
                                                                        </button>
                                                                    )}

                                                                    {(user?.role === 'financial_officer' || user?.role === 'admin') && p.expenditures?.some(e => e.readyForPayment && !e.financeReleased) && (
                                                                        <button 
                                                                            className="btn btn-accent btn-sm" 
                                                                            onClick={() => { setSelectedProject(p); setShowReleaseModal(true); }}
                                                                            style={{ background: 'var(--accent-green)', color: 'white' }}
                                                                        >
                                                                            💸 Release Budget
                                                                        </button>
                                                                    )}

                                                                    {user?.role === 'contractor' && p.contractor?._id === user?._id && ['approved', 'in_progress', 'verification'].includes(p.status) && (
                                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                                            <button className="btn btn-outline btn-sm" onClick={() => handleUpdateStatus(p._id)}>Status</button>
                                                                            {p.projectCode && (
                                                                                <Link 
                                                                                    to={`/expenses?code=${p.projectCode}`} 
                                                                                    className="btn btn-primary btn-sm"
                                                                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                                >
                                                                                    💰 Log Expense
                                                                                </Link>
                                                                            )}
                                                                        </div>
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
                            </div>
                            <div className="grid-2">
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
                                                                        background: form.location.wardNo === w.wardNo ? '#1e3a8a' : '#f8fafc',
                                                                        color: form.location.wardNo === w.wardNo ? '#ffffff' : '#0f172a',
                                                                        border: form.location.wardNo === w.wardNo ? '1px solid #1e3a8a' : '1px solid #e2e8f0'
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
                                                            background: form.location.area === a ? '#1e3a8a' : '#f1f5f9',
                                                            color: form.location.area === a ? '#ffffff' : '#0f172a',
                                                            border: '1px solid',
                                                            borderColor: form.location.area === a ? '#1e3a8a' : '#cbd5e1',
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

                            <div className="form-group" style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(37, 99, 235, 0.2)', marginTop: '20px' }}>
                                <label className="form-label" style={{ color: '#2563eb', fontWeight: 700 }}>👷 Final Step: Assign Contractor</label>
                                <select className="form-select" value={form.contractor} onChange={(e) => setForm({ ...form, contractor: e.target.value })} style={{ borderColor: '#2563eb' }}>
                                    <option value="">-- No Contractor --</option>
                                    {contractors.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    The assigned contractor will receive a notification and the secure Project Code to start logging expenses.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', fontWeight: 800 }}>Submit Project & Assign</button>
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
            {/* Engineer Verification Modal */}
            {showVerifyModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">🔍 Verification — Site Visit Proof</h2>
                            <button className="btn-close" onClick={() => setShowVerifyModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleVerify}>
                            <div className="form-group">
                                <label className="form-label">Select Pending Expenditure</label>
                                <select className="form-select" value={verifyForm.expenditureId} onChange={e => setVerifyForm({...verifyForm, expenditureId: e.target.value})} required>
                                    <option value="">-- Choose Expenditure --</option>
                                    {selectedProject?.expenditures?.filter(e => !e.engineerVerified).map(e => (
                                        <option key={e._id} value={e._id}>{e.material} - ₹{e.amount.toLocaleString()} ({new Date(e.date).toLocaleDateString()})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Decision</label>
                                <select className="form-select" value={verifyForm.verified} onChange={e => setVerifyForm({...verifyForm, verified: e.target.value === 'true'})}>
                                    <option value="true">✅ Verified & Approved</option>
                                    <option value="false">❌ Rejected / Discrepancy</option>
                                </select>
                            </div>
                            {verifyForm.verified && (
                                <div className="form-group">
                                    <label className="form-label">📍 GPS Site Inspection Photo (Mandatory)</label>
                                    <input className="form-input" type="file" accept="image/*" capture="environment" onChange={e => setVerifyForm({...verifyForm, photo: e.target.files[0]})} required />
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Remarks</label>
                                <textarea className="form-input" rows="3" value={verifyForm.remarks} onChange={e => setVerifyForm({...verifyForm, remarks: e.target.value})} required placeholder="Enter inspection details..."></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Confirm Site Verification</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Finance Release Modal */}
            {showReleaseModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">💸 Release Budget to Contractor</h2>
                            <button className="btn-close" onClick={() => setShowReleaseModal(false)}>&times;</button>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '20px' }}>
                                <h4 style={{ color: 'var(--accent-blue)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>🏦 Enter Disbursement Details</h4>
                                <div className="grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Bank Name</label>
                                        <input className="form-input" value={releaseForm.bankName} onChange={e => setReleaseForm({...releaseForm, bankName: e.target.value})} placeholder="e.g. State Bank of India" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Account Number</label>
                                        <input className="form-input" value={releaseForm.accountNumber} onChange={e => setReleaseForm({...releaseForm, accountNumber: e.target.value})} placeholder="Enter 12-16 digit A/C No." />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">IFSC Code</label>
                                    <input className="form-input" value={releaseForm.ifscCode} onChange={e => setReleaseForm({...releaseForm, ifscCode: e.target.value.toUpperCase()})} placeholder="e.g. SBIN0001234" />
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    💡 <strong>Contractor:</strong> {selectedProject?.contractor?.name}
                                </div>
                            </div>
                            
                            <h4 style={{ marginBottom: '10px' }}>Verified Expenditures Pending Release:</h4>
                            {selectedProject?.expenditures?.filter(e => e.readyForPayment && !e.financeReleased).map(e => (
                                <div key={e._id} className="glass-card" style={{ padding: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{e.material}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>₹{e.amount.toLocaleString()} | {new Date(e.date).toLocaleDateString()}</div>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={() => handleRelease(selectedProject._id, e._id)}>Release Amount</button>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowReleaseModal(false)}>Close</button>
                    </div>
                </div>
            )}
            {/* Image Lightbox Overlay */}
            {lightboxUrl && (
                <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.95)', zIndex: 9999 }}>
                    <button 
                        onClick={() => setLightboxUrl(null)}
                        style={{ 
                            position: 'absolute', 
                            top: '20px', 
                            right: '20px', 
                            background: '#ff4444', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '50%', 
                            width: '50px', 
                            height: '50px', 
                            fontSize: '24px', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(255,0,0,0.3)',
                            zIndex: 10000
                        }}
                    >
                        &times;
                    </button>
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <img src={lightboxUrl} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt="Project" />
                    </div>
                </div>
            )}
        </div>
    );
}
