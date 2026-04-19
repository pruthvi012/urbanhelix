import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fundAPI } from '../services/api';

export default function Funds() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ type: '', status: '' });

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

    const formatCurrency = (amt) => {
        if (!amt) return '—';
        if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(1)} Cr`;
        if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)} L`;
        return `₹${amt.toLocaleString()}`;
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Fund Transactions</h1>
                <p className="page-subtitle">Track fund allocations, disbursements, and payments</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <select className="form-select" style={{ width: 'auto' }} value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
                    <option value="">All Types</option>
                    <option value="allocation">Allocation</option>
                    <option value="disbursement">Disbursement</option>
                    <option value="payment">Payment</option>
                </select>
                <select className="form-select" style={{ width: 'auto' }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="verification_1">Verification Stage 1</option>
                    <option value="verification_2">Verification Stage 2</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            <div className="table-container">
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
            </div>
        </div>
    );
}
