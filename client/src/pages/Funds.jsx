import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fundAPI, projectAPI } from '../services/api';

export default function Funds() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ type: '', status: '' });
    const [projectCode, setProjectCode] = useState('');
    const [paymentLookup, setPaymentLookup] = useState(null);
    const [lookupMessage, setLookupMessage] = useState('');

    useEffect(() => { loadData(); }, [filter]);

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

    const checkPaymentStatus = async () => {
        const code = projectCode.trim().toUpperCase();
        if (!code) return setLookupMessage('Enter a project code first.');
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
            const transactionRes = await fundAPI.getAll({ project: project._id, limit: 100 });
            setPaymentLookup({ project, transactions: transactionRes.data?.transactions || [] });
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

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;

    const isContractor = user?.role === 'contractor';
    const paidTransactions = paymentLookup?.transactions.filter((transaction) => ['payment', 'disbursement'].includes(transaction.type) && ['approved', 'completed'].includes(transaction.status)) || [];
    const pendingTransactions = paymentLookup?.transactions.filter((transaction) => ['payment', 'disbursement'].includes(transaction.type) && !['approved', 'completed', 'rejected'].includes(transaction.status)) || [];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{isContractor ? 'My Payment Status' : 'Fund Transactions'}</h1>
                <p className="page-subtitle">{isContractor ? 'Enter an assigned project code to check whether payment has been released.' : 'Track fund allocations, disbursements, and payments'}</p>
            </div>

            {isContractor && (
                <div className="glass-card" style={{ padding: '24px', maxWidth: '760px', borderTop: '4px solid var(--accent-teal)' }}>
                    <h3 style={{ marginBottom: '6px' }}>Check payment using project code</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Only projects assigned to your contractor account can be checked.</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input className="form-input" placeholder="Enter project code, e.g. UHX-XXXXXX" value={projectCode} onChange={(event) => setProjectCode(event.target.value.toUpperCase())} onKeyDown={(event) => event.key === 'Enter' && checkPaymentStatus()} style={{ flex: '1 1 280px', margin: 0, textTransform: 'uppercase' }} />
                        <button className="btn btn-primary" onClick={checkPaymentStatus}>Check payment</button>
                    </div>
                    {lookupMessage && <div style={{ marginTop: '13px', color: 'var(--accent-amber)', fontWeight: 700, fontSize: '13px' }}>{lookupMessage}</div>}
                    {paymentLookup && <div style={{ marginTop: '18px', padding: '18px', borderRadius: '12px', background: paidTransactions.length ? 'var(--accent-mint-light)' : 'var(--accent-amber-light)', border: `1px solid ${paidTransactions.length ? '#a7f3d0' : '#fde68a'}` }}>
                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{paymentLookup.project.title}</div>
                        {paidTransactions.length > 0 ? <><div style={{ color: '#047857', fontWeight: 800, marginTop: '10px' }}>✓ Payment paid</div><div style={{ fontSize: '13px', marginTop: '4px' }}>Released amount: {formatCurrency(paidTransactions.reduce((sum, transaction) => sum + transaction.amount, 0))}</div></> : pendingTransactions.length > 0 ? <><div style={{ color: '#a16207', fontWeight: 800, marginTop: '10px' }}>Payment is under verification</div><div style={{ fontSize: '13px', marginTop: '4px' }}>No payment has been released yet.</div></> : <><div style={{ color: '#a16207', fontWeight: 800, marginTop: '10px' }}>No payment done yet</div><div style={{ fontSize: '13px', marginTop: '4px' }}>No payment transaction has been raised for this project.</div></>}</div>}
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
