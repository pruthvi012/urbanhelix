import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fundAPI, projectAPI } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiDownload, FiSend, FiSearch, FiUpload, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

function extractProjectCode(text = '') {
    const match = String(text).toUpperCase().match(/UHX-[A-Z0-9]+/);
    if (match) return match[0];
    return String(text).trim().toUpperCase();
}

function getContractorPaymentStatus(project, transactions) {
    const expenditures = project?.expenditures || [];
    const paidFromExpenses = expenditures.filter((expense) => expense.financeReleased);
    const pendingFromExpenses = expenditures.filter((expense) => expense.readyForPayment && !expense.financeReleased);
    const paidFromFunds = (transactions || []).filter((t) => ['payment', 'disbursement'].includes(t.type) && ['approved', 'completed'].includes(t.status));
    const pendingFromFunds = (transactions || []).filter((t) => ['payment', 'disbursement'].includes(t.type) && !['approved', 'completed', 'rejected'].includes(t.status));

    if (paidFromExpenses.length || paidFromFunds.length) {
        const amount = paidFromExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
            || paidFromFunds.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        return { key: 'paid', label: 'Paid', amount };
    }
    if (pendingFromExpenses.length || pendingFromFunds.length) {
        return { key: 'pending', label: 'Pending' };
    }
    return { key: 'not_yet_paid', label: 'No payment done' };
}

export default function Funds() {
    const { user } = useAuth();
    const isContractor = user?.role === 'contractor';
    const isFinanceOfficer = user?.role === 'financial_officer';

    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(!isContractor);
    const [filter, setFilter] = useState({ type: '', status: '' });

    // Shared lookup state (used by both contractor & finance officer)
    const [projectCode, setProjectCode] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [paymentLookup, setPaymentLookup] = useState(null);
    const [lookupMessage, setLookupMessage] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);

    // Finance officer bank-details state
    const [releaseDetails, setReleaseDetails] = useState({ bankName: '', accountNumber: '', ifscCode: '' });
    const [releaseMessage, setReleaseMessage] = useState('');
    const [releasing, setReleasing] = useState(false);

    useEffect(() => {
        if (isContractor) { setLoading(false); return; }
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
                || fromContents || fromName;
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
        setLookupMessage('');
        setLookupLoading(true);
        setPaymentLookup(null);
        try {
            const projectRes = await projectAPI.getAll({ projectCode: code, limit: 10 });
            const project = (projectRes.data?.projects || []).find(
                (item) => item.projectCode === code || `UHX-${item._id.substring(18).toUpperCase()}` === code
            );
            if (!project) {
                setLookupLoading(false);
                return setLookupMessage('No project was found for this code. Please check and try again.');
            }
            if (isContractor) {
                const assignedContractorId = project.contractor?._id || project.contractor;
                if (!assignedContractorId || String(assignedContractorId) !== String(user._id)) {
                    setLookupLoading(false);
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
            setReleaseMessage('');
        } catch {
            setLookupMessage('Unable to check this code. Please try again.');
        } finally {
            setLookupLoading(false);
        }
    };

    const formatCurrency = (amt) => {
        if (!amt) return '—';
        if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    // ─── Finance Officer: proper jsPDF download ───
    const downloadFinancePDF = () => {
        if (!paymentLookup) return;
        const { project, transactions: txns } = paymentLookup;
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString('en-IN');

        doc.setFontSize(18);
        doc.setTextColor(13, 118, 110); // teal
        doc.text('UrbanHelix — Finance Payment Report', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString('en-IN')}   |   Generated by: ${user?.name || 'Finance Officer'}`, 14, 28);

        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(`Project: ${project.title}`, 14, 38);
        doc.text(`Project Code: ${project.projectCode || 'N/A'}`, 14, 45);
        doc.text(`Contractor: ${project.contractor?.name || 'Not assigned'}`, 14, 52);

        const status = getContractorPaymentStatus(project, txns);
        doc.setFontSize(11);
        doc.setTextColor(status.key === 'paid' ? 4 : status.key === 'pending' ? 161 : 146,
            status.key === 'paid' ? 120 : status.key === 'pending' ? 98 : 64,
            status.key === 'paid' ? 87 : status.key === 'pending' ? 7 : 14);
        doc.text(`Payment Status: ${status.label}${status.amount ? ` (${formatCurrency(status.amount)})` : ''}`, 14, 60);

        const expenditures = (project.expenditures || []).map(e => [
            e.material || '—',
            formatCurrency(e.amount),
            e.readyForPayment ? 'Engineer Verified' : 'Pending Verification',
            e.financeReleased ? 'Released' : 'Not Released'
        ]);

        if (expenditures.length) {
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(12);
            doc.text('Expenditure Breakdown:', 14, 70);
            autoTable(doc, {
                startY: 75,
                head: [['Material / Item', 'Amount', 'Verification', 'Release Status']],
                body: expenditures,
                theme: 'striped',
                headStyles: { fillColor: [13, 148, 136] }
            });
        }

        const txRows = txns.map(t => [
            t.type, formatCurrency(t.amount),
            t.from?.name || t.from?.entityType || '—',
            t.to?.name || t.to?.entityType || '—',
            t.status?.replace('_', ' ')
        ]);

        if (txRows.length) {
            const startY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : 80;
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text('Fund Transactions:', 14, startY);
            autoTable(doc, {
                startY: startY + 5,
                head: [['Type', 'Amount', 'From', 'To', 'Status']],
                body: txRows,
                theme: 'striped',
                headStyles: { fillColor: [13, 148, 136] }
            });
        }

        doc.save(`UrbanHelix_Payment_Report_${project.projectCode || 'Project'}_${date.replace(/\//g, '-')}.pdf`);
    };

    const releasePayment = async (expenditure) => {
        if (!releaseDetails.bankName || !releaseDetails.accountNumber || !releaseDetails.ifscCode) {
            return setReleaseMessage('⚠ Enter the contractor bank name, account number, and IFSC code before releasing payment.');
        }
        if (!window.confirm(`Release ${formatCurrency(expenditure.amount)} to account ${releaseDetails.accountNumber}?`)) return;
        setReleasing(true);
        setReleaseMessage('');
        try {
            await projectAPI.releaseExpenditure(paymentLookup.project._id, expenditure._id, releaseDetails);
            setReleaseMessage('✓ Payment released successfully.');
            await checkPaymentStatus(paymentLookup.project.projectCode);
        } catch (error) {
            setReleaseMessage(error.response?.data?.message || '✗ Payment release failed. Please try again.');
        } finally {
            setReleasing(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;

    const contractorPayment = paymentLookup ? getContractorPaymentStatus(paymentLookup.project, paymentLookup.transactions) : null;
    const pendingExpenditures = paymentLookup ? (paymentLookup.project.expenditures || []).filter(e => e.readyForPayment && !e.financeReleased) : [];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">
                    {isContractor ? 'My Payment Status' : isFinanceOfficer ? 'Finance & Payment Management' : 'Fund Transactions'}
                </h1>
                <p className="page-subtitle">
                    {isContractor
                        ? 'Enter your assigned project code to check if payment has been released.'
                        : isFinanceOfficer
                            ? 'Look up a project to release verified contractor payments and download reports.'
                            : 'Track fund allocations, disbursements, and payments'}
                </p>
            </div>

            {/* ─── CONTRACTOR: Payment Status via Project Code ─── */}
            {isContractor && (
                <div className="glass-card" style={{ padding: '28px', maxWidth: '760px', borderTop: '4px solid var(--accent-teal)', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <FiSearch style={{ color: 'var(--accent-teal)', fontSize: '20px' }} />
                        <h3 style={{ margin: 0 }}>Check your payment status</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '18px' }}>
                        Enter the project code given to you by your engineer or admin. Payment status is only shown for projects assigned to your account.
                    </p>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            className="form-input"
                            placeholder="Enter project code, e.g. UHX-XXXXXX"
                            value={projectCode}
                            onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && applyCodeAndCheck(e.target.value)}
                            style={{ flex: '1 1 260px', margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}
                        />
                        <button className="btn btn-primary" onClick={() => applyCodeAndCheck(projectCode)} disabled={lookupLoading}>
                            {lookupLoading ? 'Checking…' : 'Check payment'}
                        </button>
                        <label className="btn btn-outline" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiUpload size={14} /> Upload code
                            <input type="file" accept=".txt,.csv,.json,.pdf,text/plain" onChange={handleCodeFile} hidden />
                        </label>
                    </div>

                    {uploadedFileName && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>📎 Uploaded: {uploadedFileName}</div>
                    )}

                    {lookupMessage && (
                        <div style={{ marginTop: '14px', padding: '12px 16px', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontWeight: 600, fontSize: '13px' }}>
                            {lookupMessage}
                        </div>
                    )}

                    {paymentLookup && contractorPayment && (
                        <div style={{
                            marginTop: '20px', padding: '22px', borderRadius: '14px',
                            background: contractorPayment.key === 'paid' ? '#ecfdf5' : contractorPayment.key === 'pending' ? '#fffbeb' : '#fff7ed',
                            border: `2px solid ${contractorPayment.key === 'paid' ? '#6ee7b7' : contractorPayment.key === 'pending' ? '#fcd34d' : '#fed7aa'}`
                        }}>
                            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text-main)' }}>{paymentLookup.project.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{paymentLookup.project.projectCode}</div>

                            {contractorPayment.key === 'paid' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                                    <FiCheckCircle style={{ color: '#047857', fontSize: '28px', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ color: '#047857', fontWeight: 800, fontSize: '20px' }}>Payment Done ✓</div>
                                        <div style={{ fontSize: '13px', color: '#065f46', marginTop: '2px' }}>
                                            Released amount: <strong>{formatCurrency(contractorPayment.amount)}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contractorPayment.key === 'pending' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                                    <FiClock style={{ color: '#b45309', fontSize: '28px', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ color: '#b45309', fontWeight: 800, fontSize: '20px' }}>Payment Pending</div>
                                        <div style={{ fontSize: '13px', color: '#92400e', marginTop: '2px' }}>
                                            Your expense has been submitted and is awaiting finance officer release.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {contractorPayment.key === 'not_yet_paid' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                                    <FiAlertCircle style={{ color: '#c2410c', fontSize: '28px', flexShrink: 0 }} />
                                    <div>
                                        <div style={{ color: '#c2410c', fontWeight: 800, fontSize: '20px' }}>No Payment Done</div>
                                        <div style={{ fontSize: '13px', color: '#9a3412', marginTop: '2px' }}>
                                            No payment has been released for this project yet. Contact your finance officer.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ─── FINANCE OFFICER: Project Lookup + Payment Release + PDF Download ─── */}
            {isFinanceOfficer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>

                    {/* Step 1: Project Code Lookup */}
                    <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid var(--accent-teal)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <FiSearch style={{ color: 'var(--accent-teal)', fontSize: '18px' }} />
                            <h3 style={{ margin: 0 }}>Step 1 — Look up project payment status</h3>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                            Enter a project code to view payment and expenditure details for that project.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <input
                                className="form-input"
                                placeholder="UHX-XXXXXX"
                                value={projectCode}
                                onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && checkPaymentStatus()}
                                style={{ maxWidth: '300px', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}
                            />
                            <button className="btn btn-primary" onClick={() => checkPaymentStatus()} disabled={lookupLoading}>
                                {lookupLoading ? 'Searching…' : 'Check payment status'}
                            </button>
                            {paymentLookup && (
                                <button className="btn btn-outline" onClick={() => { setPaymentLookup(null); setProjectCode(''); setLookupMessage(''); setReleaseMessage(''); }}>
                                    Clear
                                </button>
                            )}
                        </div>

                        {lookupMessage && (
                            <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontWeight: 600, fontSize: '13px' }}>
                                {lookupMessage}
                            </div>
                        )}

                        {paymentLookup && (
                            <div style={{ marginTop: '18px', padding: '18px', borderRadius: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{paymentLookup.project.title}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                            {paymentLookup.project.projectCode} · Contractor: <strong>{paymentLookup.project.contractor?.name || 'Not assigned'}</strong>
                                        </div>
                                    </div>
                                    {(() => {
                                        const s = getContractorPaymentStatus(paymentLookup.project, paymentLookup.transactions);
                                        return (
                                            <span style={{
                                                padding: '6px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '13px',
                                                background: s.key === 'paid' ? '#d1fae5' : s.key === 'pending' ? '#fef3c7' : '#fee2e2',
                                                color: s.key === 'paid' ? '#065f46' : s.key === 'pending' ? '#92400e' : '#991b1b'
                                            }}>
                                                {s.key === 'paid' ? '✓ Paid' : s.key === 'pending' ? '⏳ Pending' : '✗ No Payment Done'}
                                            </span>
                                        );
                                    })()}
                                </div>

                                {paymentLookup.transactions.length > 0 && (
                                    <div style={{ marginTop: '14px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fund Transactions</div>
                                        {paymentLookup.transactions.map((t) => (
                                            <div key={t._id} style={{ padding: '8px 0', borderTop: '1px solid var(--border-subtle)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ textTransform: 'capitalize' }}>{t.type}: <strong>{formatCurrency(t.amount)}</strong></span>
                                                <span className={`badge badge-${t.status === 'approved' || t.status === 'completed' ? 'completed' : t.status === 'rejected' ? 'rejected' : 'pending'}`}>
                                                    {t.status?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {paymentLookup.transactions.length === 0 && (
                                    <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        No fund transactions have been raised for this project yet.
                                    </div>
                                )}

                                {/* PDF Download Button */}
                                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                                    <button
                                        className="btn btn-outline"
                                        onClick={downloadFinancePDF}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <FiDownload size={15} />
                                        Download Payment Report (PDF)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Release Payment with Bank Details */}
                    {paymentLookup && paymentLookup.project.contractor && (
                        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #3b82f6', background: '#f8faff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <FiSend style={{ color: '#3b82f6', fontSize: '18px' }} />
                                <h3 style={{ margin: 0, color: '#1d4ed8' }}>Step 2 — Release contractor payment</h3>
                            </div>
                            <p style={{ color: '#475569', fontSize: '13px', marginBottom: '20px' }}>
                                Contractor: <strong>{paymentLookup.project.contractor.name}</strong>. Enter bank details and release each engineer-verified expenditure.
                            </p>

                            {/* Bank Details Form */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Bank Name *</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. State Bank of India"
                                        value={releaseDetails.bankName}
                                        onChange={(e) => setReleaseDetails({ ...releaseDetails, bankName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Account Number *</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. 1234567890123"
                                        value={releaseDetails.accountNumber}
                                        onChange={(e) => setReleaseDetails({ ...releaseDetails, accountNumber: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">IFSC Code *</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g. SBIN0001234"
                                        value={releaseDetails.ifscCode}
                                        onChange={(e) => setReleaseDetails({ ...releaseDetails, ifscCode: e.target.value.toUpperCase() })}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </div>
                            </div>

                            {/* Release Message */}
                            {releaseMessage && (
                                <div style={{
                                    marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
                                    background: releaseMessage.startsWith('✓') ? '#d1fae5' : '#fee2e2',
                                    border: `1px solid ${releaseMessage.startsWith('✓') ? '#6ee7b7' : '#fca5a5'}`,
                                    color: releaseMessage.startsWith('✓') ? '#065f46' : '#991b1b',
                                    fontWeight: 600, fontSize: '13px'
                                }}>
                                    {releaseMessage}
                                </div>
                            )}

                            {/* Pending Expenditures */}
                            {pendingExpenditures.length > 0 ? (
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        Engineer-verified — awaiting release ({pendingExpenditures.length})
                                    </div>
                                    {pendingExpenditures.map((expense) => (
                                        <div key={expense._id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            gap: '12px', padding: '14px 16px', marginBottom: '8px',
                                            borderRadius: '10px', background: 'white', border: '1px solid #bfdbfe'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '14px' }}>{expense.material}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                                    {formatCurrency(expense.amount)} · Engineer verified ✓
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => releasePayment(expense)}
                                                disabled={releasing}
                                                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <FiSend size={13} />
                                                {releasing ? 'Releasing…' : 'Release payment'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ padding: '16px', borderRadius: '10px', background: '#f1f5f9', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                                    No engineer-verified payments are currently awaiting release for this project.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ─── NON-CONTRACTOR: Filter Controls & Transaction Table ─── */}
            {!isContractor && (
                <>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                        {!isFinanceOfficer && (
                            <div style={{ marginLeft: 'auto' }}>
                                <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FiDownload size={14} /> Export
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th><th>From</th><th>To</th><th>Amount</th><th>Project</th><th>Status</th><th>Verifications</th>
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
                    </div>
                </>
            )}
        </div>
    );
}
