import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fundAPI, projectAPI } from '../services/api';

function extractProjectCode(text = '') {
    const match = String(text).toUpperCase().match(/UHX-[A-Z0-9]+/);
    if (match) return match[0];
    return String(text).trim().toUpperCase();
}

function getContractorPaymentStatus(project, transactions) {
    const expenditures = project?.expenditures || [];
    const paidFromExpenses = expenditures.filter((expense) => expense.financeReleased);
    const pendingFromExpenses = expenditures.filter((expense) => expense.readyForPayment && !expense.financeReleased);
    const paidFromFunds = (transactions || []).filter((transaction) => ['payment', 'disbursement'].includes(transaction.type) && ['approved', 'completed'].includes(transaction.status));
    const pendingFromFunds = (transactions || []).filter((transaction) => ['payment', 'disbursement'].includes(transaction.type) && !['approved', 'completed', 'rejected'].includes(transaction.status));

    if (paidFromExpenses.length || paidFromFunds.length) {
        const amount = paidFromExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
            || paidFromFunds.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
        return { key: 'paid', label: 'Paid', amount };
    }
    if (pendingFromExpenses.length || pendingFromFunds.length) {
        return { key: 'pending', label: 'Pending' };
    }
    return { key: 'not_yet_paid', label: 'Not yet paid' };
}

export default function Funds() {
    const { user } = useAuth();
    const isContractor = user?.role === 'contractor';
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(!isContractor);
    const [filter, setFilter] = useState({ type: '', status: '' });
    const [projectCode, setProjectCode] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [paymentLookup, setPaymentLookup] = useState(null);
    const [lookupMessage, setLookupMessage] = useState('');
    const [releaseDetails, setReleaseDetails] = useState({ bankName: '', accountNumber: '', ifscCode: '' });

    useEffect(() => {
        if (isContractor) {
            setLoading(false);
            return;
        }
        loadData();
    }, [filter, isContractor]);

    const loadData = async () => {
        try {
            const params = {};
            if (filter.type) params.type = filter.type;
            if (filter.status) params.status = filter.status;
            const res = await fundAPI.getAll(params);
            setTransactions(res.data.transactions || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleVerify = async (id, approved) => {
        const remarks = approved ? 'Verified and approved' : prompt('Rejection reason:');
        if (!approved && !remarks) return;
        try {
            await fundAPI.verify(id, { approved, remarks });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error verifying'); }
    };

    const applyCodeAndCheck = (rawCode) => {
        const code = extractProjectCode(rawCode);
        if (!code) return setLookupMessage('Enter or upload a valid project code first.');
        setProjectCode(code);
        checkPaymentStatus(code);
    };

    const handleCodeFile = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setUploadedFileName(file.name);
        try {
            const text = await file.text();
            const fromContents = extractProjectCode(text);
            const fromName = extractProjectCode(file.name.replace(/\.[^.]+$/, ''));
            const code = (fromContents && fromContents.startsWith('UHX-') ? fromContents : null)
                || (fromName && fromName.startsWith('UHX-') ? fromName : null)
                || fromContents
                || fromName;
            if (!code) {
                setPaymentLookup(null);
                return setLookupMessage('No project code was found in that file. Upload a code file or type the UHX- code.');
            }
            applyCodeAndCheck(code);
        } catch {
            setPaymentLookup(null);
            setLookupMessage('Could not read that file. Type the project code instead.');
        }
    };

    const checkPaymentStatus = async (overrideCode) => {
        const code = extractProjectCode(overrideCode || projectCode);
        if (!code) return setLookupMessage('Enter or upload a valid project code first.');
        setLookupMessage('Checking payment status…');
        try {
            const projectRes = await projectAPI.getAll({ projectCode: code, limit: 10 });
            const project = (projectRes.data?.projects || []).find((item) => item.projectCode === code || `UHX-${item._id.substring(18).toUpperCase()}` === code);
            if (!project) {
                setPaymentLookup(null);
                return setLookupMessage('No project was found for this code.');
            }
            if (user?.role === 'contractor') {
                const assignedContractorId = project.contractor?._id || project.contractor;
                if (!assignedContractorId || String(assignedContractorId) !== String(user._id)) {
                    setPaymentLookup(null);
                    return setLookupMessage('This project code is not assigned to your contractor account.');
                }
            }
            const [projectDetailRes, transactionRes] = await Promise.all([
                projectAPI.getById(project._id),
                fundAPI.getAll({ project: project._id, limit: 100 })
            ]);
            const detailedProject = projectDetailRes.data?.project || project;
            setPaymentLookup({ project: detailedProject, transactions: transactionRes.data?.transactions || [] });
            setReleaseDetails({
                bankName: detailedProject.contractor?.bankDetails?.bankName || '',
                accountNumber: detailedProject.contractor?.bankDetails?.accountNumber || '',
                ifscCode: detailedProject.contractor?.bankDetails?.ifscCode || ''
            });
            setLookupMessage('');
        } catch {
            setPaymentLookup(null);
            setLookupMessage('Unable to check this code. Please try again.');
        }
    };

    const formatCurrency = (amt) => {
        if (!amt) return '—';
        if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    const downloadFinanceReport = () => {
        if (!paymentLookup) return;
        const { project, transactions: projectTransactions } = paymentLookup;
        const rows = projectTransactions.length ? projectTransactions.map((transaction) => `<tr><td>${transaction.type}</td><td>₹${Number(transaction.amount || 0).toLocaleString('en-IN')}</td><td>${transaction.status.replace('_', ' ')}</td></tr>`).join('') : '<tr><td colspan="3">No payment transaction has been raised.</td></tr>';
        const report = window.open('', '_blank');
        report.document.write(`<!doctype html><title>Finance Payment Report</title><style>body{font-family:Arial;padding:38px;color:#0f172a}h1{color:#0f766e}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:12px;border:1px solid #dbe3ea;text-align:left}th{background:#f1f5f9}.note{padding:14px;background:#ecfdf5;border-radius:8px}</style><h1>UrbanHelix Finance Payment Report</h1><p>Project: <b>${project.title}</b><br>Project code: ${project.projectCode || 'N/A'}<br>Contractor: ${project.contractor?.name || 'Not assigned'}</p><div class="note">Payment status recorded on ${new Date().toLocaleString('en-IN')}</div><table><thead><tr><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()</script>`);
        report.document.close();
    };

    const releasePayment = async (expenditure) => {
        if (!releaseDetails.accountNumber || !releaseDetails.ifscCode || !releaseDetails.bankName) return setLookupMessage('Enter the contractor bank name, account number, and IFSC code before releasing payment.');
        if (!window.confirm(`Release ${formatCurrency(expenditure.amount)} to account ${releaseDetails.accountNumber}?`)) return;
        try {
            await projectAPI.releaseExpenditure(paymentLookup.project._id, expenditure._id, releaseDetails);
            setLookupMessage('✓ Payment released successfully.');
            await checkPaymentStatus();
        } catch (error) {
            setLookupMessage(error.response?.data?.message || 'Payment release failed. Please try again.');
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;

    const contractorPayment = paymentLookup ? getContractorPaymentStatus(paymentLookup.project, paymentLookup.transactions) : null;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{isContractor ? 'My Payment Status' : 'Fund Transactions'}</h1>
                <p className="page-subtitle">{isContractor ? 'Enter an assigned project code to check whether payment has been released.' : 'Track fund allocations, disbursements, and payments'}</p>
            </div>

            {isContractor && (
                <div className="glass-card" style={{ padding: '24px', maxWidth: '760px', borderTop: '4px solid var(--accent-teal)' }}>
                    <h3 style={{ marginBottom: '6px' }}>Check payment using project code</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Enter or upload the project code given to you. Payment status is shown only for projects assigned to your contractor account.</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input className="form-input" placeholder="Enter project code, e.g. UHX-XXXXXX" value={projectCode} onChange={(event) => setProjectCode(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === 'Enter' && applyCodeAndCheck(event.target.value)} style={{ flex: '1 1 280px', margin: 0, textTransform: 'uppercase' }} />
                        <button className="btn btn-primary" onClick={() => applyCodeAndCheck(projectCode)}>Check payment</button>
                        <label className="btn btn-outline" style={{ margin: 0, cursor: 'pointer' }}>
                            Upload code
                            <input type="file" accept=".txt,.csv,.json,.pdf,text/plain" onChange={handleCodeFile} hidden />
                        </label>
                    </div>
                    {uploadedFileName && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Uploaded: {uploadedFileName}</div>}
                    {lookupMessage && <div style={{ marginTop: '13px', color: 'var(--accent-amber)', fontWeight: 700, fontSize: '13px' }}>{lookupMessage}</div>}
                    {paymentLookup && contractorPayment && <div style={{ marginTop: '18px', padding: '18px', borderRadius: '12px', background: contractorPayment.key === 'paid' ? 'var(--accent-mint-light)' : 'var(--accent-amber-light)', border: `1px solid ${contractorPayment.key === 'paid' ? '#a7f3d0' : '#fde68a'}` }}>
                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{paymentLookup.project.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{paymentLookup.project.projectCode}</div>
                        {contractorPayment.key === 'paid' ? (
                            <>
                                <div style={{ color: '#047857', fontWeight: 800, marginTop: '10px', fontSize: '18px' }}>Paid</div>
                                <div style={{ fontSize: '13px', marginTop: '4px' }}>Released amount: {formatCurrency(contractorPayment.amount)}</div>
                            </>
                        ) : contractorPayment.key === 'pending' ? (
                            <>
                                <div style={{ color: '#a16207', fontWeight: 800, marginTop: '10px', fontSize: '18px' }}>Pending</div>
                                <div style={{ fontSize: '13px', marginTop: '4px' }}>Payment has been submitted and is waiting for release.</div>
                            </>
                        ) : (
                            <>
                                <div style={{ color: '#92400e', fontWeight: 800, marginTop: '10px', fontSize: '18px' }}>Not yet paid</div>
                                <div style={{ fontSize: '13px', marginTop: '4px' }}>No payment has been released for this project yet.</div>
                            </>
                        )}
                    </div>}
                </div>
            )}

            {user?.role === 'financial_officer' && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', borderLeft: '5px solid var(--accent-teal)' }}>
                    <h3 style={{ marginBottom: '5px' }}>Project payment-status lookup</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>Enter a project code to view payment status for that project only.</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input className="form-input" placeholder="UHX-XXXXXX" value={projectCode} onChange={(event) => setProjectCode(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === 'Enter' && checkPaymentStatus()} style={{ maxWidth: '280px', margin: 0, textTransform: 'uppercase' }} />
                        <button className="btn btn-primary" onClick={checkPaymentStatus}>Check payment status</button>
                        {paymentLookup && <button className="btn btn-outline" onClick={() => { setPaymentLookup(null); setProjectCode(''); setLookupMessage(''); }}>Clear</button>}
                    </div>
                    {lookupMessage && <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--accent-amber)', fontWeight: 700 }}>{lookupMessage}</div>}
                    {paymentLookup && <div style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: 'var(--bg-subtle)' }}><strong>{paymentLookup.project.title}</strong><span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>{paymentLookup.project.projectCode}</span><div style={{ marginTop: '10px', fontSize: '13px' }}>{paymentLookup.transactions.length ? paymentLookup.transactions.map((transaction) => <div key={transaction._id} style={{ padding: '7px 0', borderTop: '1px solid var(--border-subtle)' }}>{transaction.type}: <strong>{formatCurrency(transaction.amount)}</strong> — <span className={`badge badge-${transaction.status === 'approved' || transaction.status === 'completed' ? 'completed' : transaction.status === 'rejected' ? 'rejected' : 'pending'}`}>{transaction.status.replace('_', ' ')}</span></div>) : 'No payment transaction has been raised for this project yet.'}</div></div>}
                    {paymentLookup && <div style={{ marginTop: '12px' }}><button className="btn btn-outline" onClick={downloadFinanceReport}>Download payment report (PDF)</button></div>}
                    {paymentLookup && paymentLookup.project.contractor && <div style={{ marginTop: '16px', padding: '18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}><h4 style={{ marginBottom: '6px', color: '#1d4ed8' }}>Release verified contractor payment</h4><p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Contractor: <strong>{paymentLookup.project.contractor.name}</strong>. Enter bank details before release.</p><div className="grid-2"><div className="form-group"><label className="form-label">Bank name</label><input className="form-input" value={releaseDetails.bankName} onChange={(event) => setReleaseDetails({ ...releaseDetails, bankName: event.target.value })} /></div><div className="form-group"><label className="form-label">Account number</label><input className="form-input" value={releaseDetails.accountNumber} onChange={(event) => setReleaseDetails({ ...releaseDetails, accountNumber: event.target.value })} /></div></div><div className="form-group"><label className="form-label">IFSC code</label><input className="form-input" value={releaseDetails.ifscCode} onChange={(event) => setReleaseDetails({ ...releaseDetails, ifscCode: event.target.value.toUpperCase() })} /></div>{(paymentLookup.project.expenditures || []).filter((expense) => expense.readyForPayment && !expense.financeReleased).length ? (paymentLookup.project.expenditures || []).filter((expense) => expense.readyForPayment && !expense.financeReleased).map((expense) => <div key={expense._id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #bfdbfe' }}><span><strong>{expense.material}</strong><br /><small>{formatCurrency(expense.amount)} · Engineer verified</small></span><button className="btn btn-primary btn-sm" onClick={() => releasePayment(expense)}>Release payment</button></div>) : <div style={{ fontSize: '13px', color: '#475569' }}>No engineer-verified payment is waiting for release.</div>}</div>}
                </div>
            )}

            {!isContractor && <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <select className="form-select" style={{ width: 'auto' }} value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
                    <option value="">All Types</option>
                    <option value="allocation">Allocation</option>
                    <option value="disbursement">Disbursement</option>
                    <option value="payment">Payment</option>
                </select>
                <select className="form-select" style={{ width: 'auto' }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                </select>
            </div>}

            {!isContractor && <div className="table-container">
                <table className="table">
                    <thead>
                        <tr><th>Type</th><th>From</th><th>To</th><th>Amount</th><th>Project</th><th>Status</th><th>Verifications</th>
                            {['financial_officer', 'admin'].includes(user?.role) && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t._id}>
                                <td><span className={`badge badge-${t.type === 'payment' ? 'completed' : t.type === 'allocation' ? 'approved' : 'in_progress'}`}>{t.type}</span></td>
                                <td style={{ fontSize: '13px' }}>{t.from?.name || t.from?.entityType}</td>
                                <td style={{ fontSize: '13px' }}>{t.to?.name || t.to?.entityType}</td>
                                <td style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(t.amount)}</td>
                                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.project?.title || '—'}</td>
                                <td><span className={`badge badge-${t.status === 'completed' || t.status === 'approved' ? 'completed' : t.status === 'rejected' ? 'rejected' : 'pending'}`}>{t.status?.replace('_', ' ')}</span></td>
                                <td>
                                    {(t.verifications || []).map((v, i) => (
                                        <div key={i} style={{ fontSize: '11px', color: v.approved ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                            Stage {v.stage}: {v.approved ? '✓' : '✗'} {v.verifiedBy?.name}
                                        </div>
                                    ))}
                                    {(!t.verifications || t.verifications.length === 0) && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>}
                                </td>
                                {['financial_officer', 'admin'].includes(user?.role) && (
                                    <td>
                                        {t.status !== 'completed' && t.status !== 'rejected' && t.status !== 'approved' && (t.verifications || []).length < 2 && (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button className="btn btn-success btn-sm" onClick={() => handleVerify(t._id, true)}>Verify ✓</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleVerify(t._id, false)}>Reject</button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {transactions.length === 0 && <tr><td colSpan="8" className="empty-state">No transactions found</td></tr>}
                    </tbody>
                </table>
            </div>}
        </div>
    );
}
