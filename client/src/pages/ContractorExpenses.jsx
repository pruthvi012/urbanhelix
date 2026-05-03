import { useState, useEffect } from 'react';
import { projectAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { FiDollarSign, FiUpload, FiMapPin, FiCamera, FiCheckCircle } from 'react-icons/fi';

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

const formatCurrency = (amt) => {
    if (!amt) return '₹0';
    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
    return `₹${amt.toLocaleString()}`;
};

export default function ContractorExpenses() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [projectCode, setProjectCode] = useState('');
    const [codeSearched, setCodeSearched] = useState(false);
    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        invoiceDate: new Date().toISOString().split('T')[0],
        amount: '', material: '', vendor: '', remarks: '',
        invoice: null, progressPhoto: null
    });
    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');
        if (code) {
            setProjectCode(code.toUpperCase());
            // We can't call searchProject directly here because it uses state that might not be updated yet
        }
    }, [location]);

    // Use a separate useEffect to trigger search when projectCode changes from URL
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get('code');
        if (code && projectCode === code.toUpperCase() && !codeSearched) {
            searchProject();
        }
    }, [projectCode, location]);

    const searchProject = async () => {
        if (!projectCode.trim()) return;
        setLoading(true);
        setCodeSearched(true);
        setProjects([]);
        try {
            const res = await projectAPI.getAll({ projectCode: projectCode.trim() });
            const allFound = res.data.projects || [];
            
            const mine = allFound.filter(p => {
                const contractorId = p.contractor?._id || p.contractor;
                const myId = user?._id || user?.id;
                return contractorId && myId && contractorId.toString() === myId.toString();
            });

            if (allFound.length > 0 && mine.length === 0) {
                alert("Project found, but you are not the assigned contractor for this project. Please contact the Engineer.");
            }

            setProjects(mine);
            if (mine.length === 1) setSelectedProject(mine[0]);
        } catch (e) { 
            console.error("Search error:", e);
            setProjects([]); 
        } finally { setLoading(false); }
    };



    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.date !== form.invoiceDate) { alert('Expenditure date must exactly match the invoice date!'); return; }
        if (!form.invoice) { alert('Invoice/bill upload is mandatory!'); return; }
        if (!form.progressPhoto) { alert('Site progress photo is mandatory!'); return; }

        const remaining = (selectedProject.allocatedBudget || selectedProject.estimatedBudget) - selectedProject.spentBudget;
        if (Number(form.amount) > remaining) { alert(`Amount exceeds remaining budget of ${formatCurrency(remaining)}!`); return; }

        const formData = new FormData();
        formData.append('date', form.date);
        formData.append('invoiceDate', form.invoiceDate);
        formData.append('amount', form.amount);
        formData.append('material', form.material);
        formData.append('vendor', form.vendor);
        formData.append('remarks', form.remarks);
        formData.append('invoice', form.invoice);
        formData.append('progressPhoto', form.progressPhoto);

        setSubmitting(true);
        try {
            await projectAPI.logExpenditure(selectedProject._id, formData);
            setSuccess(true);
            setForm({ date: new Date().toISOString().split('T')[0], invoiceDate: new Date().toISOString().split('T')[0], amount: '', material: '', vendor: '', remarks: '', invoice: null, progressPhoto: null });
            // Refresh project to update remaining budget
            const res = await projectAPI.getAll({ projectCode: projectCode.trim() });
            const found = (res.data.projects || []).filter(p => p.contractor?._id === user?._id || p.contractor === user?._id);
            if (found.length === 1) setSelectedProject(found[0]);
            setTimeout(() => setSuccess(false), 4000);
        } catch (err) { alert(err.response?.data?.message || 'Error submitting expense'); }
        finally { setSubmitting(false); }
    };

    const materials = selectedProject ? (CATEGORY_MATERIALS[selectedProject.category] || CATEGORY_MATERIALS.other) : [];
    const remaining = selectedProject ? (selectedProject.allocatedBudget || selectedProject.estimatedBudget) - selectedProject.spentBudget : 0;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">💰 Log Work Expense</h1>
                <p className="page-subtitle">Submit material expenses with invoice proof</p>
            </div>

            {/* Step 1: Enter Project Code */}
            <div className="glass-card" style={{ marginBottom: '24px', padding: '24px' }}>
                <h3 style={{ marginBottom: '6px', fontWeight: 700, fontSize: '16px' }}>Step 1 — Enter Your Project Code</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Enter the unique code provided by the BBMP Engineer for your assigned project.</p>
                <div style={{ display: 'flex', gap: '12px', maxWidth: '480px' }}>
                    <input
                        className="form-input"
                        placeholder="e.g. UHX-A1B2C3"
                        value={projectCode}
                        onChange={e => setProjectCode(e.target.value.toUpperCase())}
                        style={{ flex: 1, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
                        onKeyDown={e => e.key === 'Enter' && searchProject()}
                    />
                    <button className="btn btn-primary" onClick={searchProject}>Find Project</button>
                </div>
                {codeSearched && projects.length === 0 && !loading && (
                    <div style={{ marginTop: '12px', color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>❌ No project found. Check the code or contact your engineer.</div>
                )}
            </div>

            {/* Step 2: Project Info */}
            {selectedProject && (
                <>
                    <div className="glass-card" style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.05))', border: '1px solid rgba(59,130,246,0.25)' }}>
                        <h3 style={{ marginBottom: '4px', fontWeight: 700, fontSize: '16px' }}>✅ Project Found</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Project</div>
                                <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedProject.title}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedProject.category?.replace('_', ' ')} • Ward {selectedProject.location?.wardNo}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Remaining Budget</div>
                                <div style={{ fontWeight: 900, fontSize: '22px', color: remaining > 0 ? 'var(--accent-green)' : '#ef4444' }}>{formatCurrency(remaining)}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>of {formatCurrency(selectedProject.allocatedBudget || selectedProject.estimatedBudget)} allocated</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Expenses Logged</div>
                                <div style={{ fontWeight: 700, fontSize: '22px', color: 'var(--accent-red)' }}>{selectedProject.expenditures?.length || 0}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>entries submitted</div>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Budget Used</span>
                                <span style={{ fontWeight: 700 }}>{selectedProject.allocatedBudget > 0 ? Math.round((selectedProject.spentBudget / (selectedProject.allocatedBudget || selectedProject.estimatedBudget)) * 100) : 0}%</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '99px', height: '8px' }}>
                                <div style={{ width: `${Math.min(100, Math.round((selectedProject.spentBudget / (selectedProject.allocatedBudget || selectedProject.estimatedBudget)) * 100))}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))', borderRadius: '99px', height: '100%', transition: 'width 0.5s' }} />
                            </div>
                        </div>
                    </div>

                    {/* Success Banner */}
                    {success && (
                        <div className="glass-card" style={{ marginBottom: '20px', padding: '16px 20px', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--accent-green)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FiCheckCircle size={24} style={{ color: 'var(--accent-green)' }} />
                            <div>
                                <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>🚀 Expense Logged & Hashed Successfully!</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Your material expenditure has been cryptographically secured. 
                                    <strong> Status: Waiting for Engineer's Physical Site Verification.</strong> 
                                    Once verified, it will be automatically sent to the Finance Department for payment release.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Expense Form */}
                    <div className="glass-card" style={{ padding: '28px' }}>
                        <h3 style={{ marginBottom: '4px', fontWeight: 700, fontSize: '16px' }}>Step 2 — Submit Material Expense</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>All fields are mandatory. The entry will be permanently locked with a SHA-256 cryptographic hash.</p>

                        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: 'var(--accent-red)', lineHeight: 1.7 }}>
                            ⚠️ <strong>Anti-Fraud Rules:</strong> Bill date must match expenditure date • Amount cannot exceed remaining budget • Only approved materials for this project type are allowed • Engineer must physically verify before payment is released.
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Dates */}
                            <div className="grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">📅 Expenditure Date</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">📅 Invoice Date <span style={{ color: 'var(--accent-red)', fontSize: '11px' }}>Must match!</span></label>
                                    <input className="form-input" type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} required />
                                </div>
                            </div>
                            {form.date !== form.invoiceDate && (
                                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '12px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                                    ⚠️ Dates do not match! The expenditure date and invoice date must be identical.
                                </div>
                            )}

                            {/* Material (AI whitelist) */}
                            <div className="form-group">
                                <label className="form-label">
                                    🧠 Material / Expense Type
                                    <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 600, background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '99px' }}>
                                        AI-Approved list for: {selectedProject.category?.replace('_', ' ')}
                                    </span>
                                </label>
                                <select className="form-select" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} required>
                                    <option value="">-- Select Material --</option>
                                    {materials.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Only approved materials for this project category are listed. Custom entries are blocked to prevent fraud.</small>
                            </div>

                            {/* Vendor */}
                            <div className="form-group">
                                <label className="form-label">🏢 Vendor / Supplier Name</label>
                                <input className="form-input" type="text" placeholder="e.g. Bharath Steels Pvt. Ltd." value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} required />
                            </div>

                            {/* Amount */}
                            <div className="form-group">
                                <label className="form-label">💰 Amount Spent (₹)</label>
                                <input className="form-input" type="number" min="1" max={remaining} placeholder={`Max: ${formatCurrency(remaining)}`} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                                <small style={{ color: remaining > 0 ? 'var(--accent-green)' : '#ef4444', fontSize: '11px', fontWeight: 600 }}>
                                    {formatCurrency(remaining)} remaining in budget
                                </small>
                            </div>

                            {/* Invoice Upload */}
                            <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--glass-border)', borderRadius: '12px', padding: '16px' }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FiUpload /> Official Invoice / Bill <span style={{ color: 'var(--accent-red)', fontSize: '11px' }}>*Mandatory</span>
                                </label>
                                <input className="form-input" type="file" accept="image/*,application/pdf" onChange={e => setForm({ ...form, invoice: e.target.files[0] })} required style={{ border: 'none', background: 'transparent', padding: '4px 0' }} />
                                {form.invoice && <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '6px' }}>✅ {form.invoice.name}</div>}
                                <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Upload the official bill/invoice (PDF or photo). Bill date must match the expenditure date above. This is permanently SHA-256 hashed.</small>
                            </div>

                            {/* Site Photo */}
                            <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--glass-border)', borderRadius: '12px', padding: '16px' }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FiCamera /> Site Progress Photo <span style={{ color: 'var(--accent-red)', fontSize: '11px' }}>*Mandatory</span>
                                </label>
                                <input className="form-input" type="file" accept="image/*" capture="environment" onChange={e => setForm({ ...form, progressPhoto: e.target.files[0] })} required style={{ border: 'none', background: 'transparent', padding: '4px 0' }} />
                                {form.progressPhoto && <div style={{ fontSize: '12px', color: 'var(--accent-green)', marginTop: '6px' }}>✅ {form.progressPhoto.name}</div>}
                                <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Take a live photo at the actual work site. Location must match the project ward to prevent fake submissions.</small>
                            </div>



                            {/* Remarks */}
                            <div className="form-group">
                                <label className="form-label">📝 Remarks (Optional)</label>
                                <input className="form-input" type="text" placeholder="Any additional details about this expense..." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                            </div>

                            {/* Submit */}
                            <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    By submitting, you confirm this expense is genuine, the work was performed, and the invoice is authentic. False entries are a criminal offence.
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting || form.date !== form.invoiceDate}
                                    style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700 }}
                                >
                                    {submitting ? '⏳ Submitting...' :
                                        form.date !== form.invoiceDate ? '⚠️ Fix Date Mismatch to Continue' :
                                        '🔒 Lock & Submit Expense Entry'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Previous Expenses */}
                    {selectedProject.expenditures?.length > 0 && (
                        <div className="section" style={{ marginTop: '24px' }}>
                            <div className="section-header">
                                <h2 className="section-title"><FiDollarSign style={{ verticalAlign: 'middle', marginRight: '8px' }} /> My Submitted Expenses</h2>
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr><th>Date</th><th>Material</th><th>Vendor</th><th>Amount</th><th>Invoice</th><th>Engineer Status</th></tr>
                                    </thead>
                                    <tbody>
                                        {[...selectedProject.expenditures].reverse().map((exp) => (
                                            <tr key={exp._id}>
                                                <td style={{ fontSize: '13px' }}>{new Date(exp.date).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: 600 }}>{exp.material}</td>
                                                <td style={{ fontSize: '13px' }}>{exp.vendor}</td>
                                                <td style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{formatCurrency(exp.amount)}</td>
                                                <td><a href={exp.invoiceUrl} target="_blank" rel="noreferrer" className="tx-tag" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)', textDecoration: 'none' }}>📄 View</a></td>

                                                <td>
                                                    {exp.engineerVerified
                                                        ? <span className="tx-tag" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' }}>✅ Verified by Engineer</span>
                                                        : <span className="tx-tag" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>⏳ Waiting for Engineer Review</span>
                                                    }
                                                    {exp.readyForPayment && !exp.paid && (
                                                        <div style={{ fontSize: '10px', color: 'var(--accent-blue)', marginTop: '4px', fontWeight: 600 }}>💰 Ready for Payment Release</div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
