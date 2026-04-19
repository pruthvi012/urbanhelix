import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { FiShield, FiSearch } from 'react-icons/fi';

export default function Audit() {
    const [chainStatus, setChainStatus] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [verifyId, setVerifyId] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);

    useEffect(() => { loadData(); }, [page]);

    const loadData = async () => {
        try {
            const [chainRes, recordsRes] = await Promise.all([
                auditAPI.verifyChain(),
                auditAPI.getChain({ page, limit: 15 }),
            ]);
            setChainStatus(chainRes.data);
            setRecords(recordsRes.data.records || []);
            setTotalPages(recordsRes.data.totalPages || 1);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleVerifyRecord = async () => {
        if (!verifyId.trim()) return;
        try {
            const res = await auditAPI.verifyRecord(verifyId.trim());
            setVerifyResult(res.data);
        } catch (err) {
            setVerifyResult({ valid: false, error: 'Record not found or invalid ID' });
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading audit data...</div>;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Blockchain Audit & Verification</h1>
                <p className="page-subtitle">Tamper-evident hash chain — Public access & auditing interface</p>
            </div>

            {/* Chain Status */}
            <div className="stats-grid">
                <div className={`stat-card ${chainStatus?.valid ? 'green' : 'red'}`}>
                    <div className="stat-card-header">
                        <span className="stat-card-label">Chain Integrity</span>
                        <div className={`stat-card-icon ${chainStatus?.valid ? 'green' : 'red'}`}><FiShield /></div>
                    </div>
                    <div className="stat-card-value" style={{ color: chainStatus?.valid ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {chainStatus?.valid ? '✓ VALID' : '✗ BROKEN'}
                    </div>
                    <div className="stat-card-change">{chainStatus?.totalRecords || 0} records in chain</div>
                </div>

                <div className="stat-card blue">
                    <div className="stat-card-header">
                        <span className="stat-card-label">Total Records</span>
                        <div className="stat-card-icon blue">📊</div>
                    </div>
                    <div className="stat-card-value">{chainStatus?.totalRecords || 0}</div>
                    <div className="stat-card-change">SHA-256 linked records</div>
                </div>

                <div className="stat-card purple">
                    <div className="stat-card-header">
                        <span className="stat-card-label">Hash Algorithm</span>
                        <div className="stat-card-icon purple">#</div>
                    </div>
                    <div className="stat-card-value" style={{ fontSize: '20px' }}>SHA-256</div>
                    <div className="stat-card-change">Cryptographic hash function</div>
                </div>
            </div>

            {/* Verify Single Record */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>🔍 Verify a Record</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input className="form-input" placeholder="Enter Record ID to verify..." value={verifyId} onChange={(e) => setVerifyId(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn btn-primary" onClick={handleVerifyRecord}><FiSearch /> Verify</button>
                </div>
                {verifyResult && (
                    <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: verifyResult.valid ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${verifyResult.valid ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                        <strong style={{ color: verifyResult.valid ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {verifyResult.valid ? '✓ Record is VALID — data integrity confirmed' : `✗ ${verifyResult.error || 'Verification failed'}`}
                        </strong>
                    </div>
                )}
            </div>

            {/* Hash Chain Records */}
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Hash Chain Explorer</h2>
                </div>
                <div className="hash-chain-list">
                    {records.map((r, i) => (
                        <div key={r._id}>
                            <div className="hash-record">
                                <div className="hash-record-number">Block #{r.sequenceNumber}</div>
                                <div className="hash-record-type">{r.recordType?.replace(/_/g, ' ')}</div>
                                <div style={{ display: 'grid', gap: '4px', marginTop: '8px' }}>
                                    <div className="hash-value" title="Record Hash">🔗 {r.recordHash}</div>
                                    <div className="hash-value" title="Data Hash" style={{ color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.08)' }}>📄 {r.dataHash}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Previous: {r.previousHash?.substring(0, 20)}... • By: {r.createdBy?.name || 'System'} • {new Date(r.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                            {i < records.length - 1 && <div className="chain-connector"></div>}
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                        <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                )}
            </div>
        </div>
    );
}
