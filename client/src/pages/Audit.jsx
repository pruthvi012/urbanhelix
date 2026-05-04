import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { FiShield, FiSearch, FiCheckCircle, FiXCircle, FiActivity, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';

export default function Audit() {
    const [chainStatus, setChainStatus] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [verifyId, setVerifyId] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);

    // New states for block-by-block verification
    const [isVerifying, setIsVerifying] = useState(false);
    const [currentlyVerifying, setCurrentlyVerifying] = useState(null);
    const [tamperedBlocks, setTamperedBlocks] = useState([]);
    const [verificationComplete, setVerificationComplete] = useState(false);

    useEffect(() => { loadData(); }, [page]);

    const loadData = async () => {
        try {
            const [chainRes, recordsRes] = await Promise.all([
                auditAPI.verifyChain(),
                auditAPI.getChain({ page, limit: 50 }), // Load more for full chain visibility
            ]);
            setChainStatus(chainRes.data);
            setRecords(recordsRes.data.records || []);
            setTotalPages(recordsRes.data.totalPages || 1);
            
            // If chain is initially tampered, show errors
            if (chainRes.data && !chainRes.data.valid && chainRes.data.errors) {
                setTamperedBlocks(chainRes.data.errors.map(e => e.sequenceNumber));
            }
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

    const handleVerifyChain = async () => {
        setIsVerifying(true);
        setVerificationComplete(false);
        setTamperedBlocks([]);
        setCurrentlyVerifying(null);
        
        try {
            const res = await auditAPI.verifyChain();
            const errors = res.data.errors || [];
            const tamperedSeqNums = errors.map(e => e.sequenceNumber);

            // Animate block-by-block from oldest to newest in the current view
            // Since records are newest first, let's go from end of array to start
            for (let i = records.length - 1; i >= 0; i--) {
                setCurrentlyVerifying(records[i].sequenceNumber);
                await new Promise(r => setTimeout(r, 300));
            }
            
            setCurrentlyVerifying(null);
            setTamperedBlocks(tamperedSeqNums);
            setChainStatus(res.data);
            setVerificationComplete(true);
        } catch (err) {
            console.error(err);
        } finally {
            setIsVerifying(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading audit data...</div>;

    return (
        <div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Blockchain Audit & Verification</h1>
                    <p className="page-subtitle">Tamper-evident hash chain — Full Visibility & Integrity Check</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="btn btn-outline" 
                        onClick={async () => {
                            if (window.confirm("CRITICAL: This will intentionally corrupt a database record for demo purposes. Proceed?")) {
                                try {
                                    await auditAPI.simulateTamper();
                                    alert("Record Tampered! Now click 'Verify Integrity' to detect it.");
                                    loadData();
                                } catch (err) { alert("Failed to tamper: " + (err.response?.data?.message || err.message)); }
                            }
                        }}
                        style={{ padding: '12px 24px', fontSize: '16px', border: '1px solid var(--accent-red)', color: 'var(--accent-red)' }}
                    >
                        ⚠️ Simulate Tamper
                    </button>
                    <button 
                        className={`btn ${isVerifying ? 'btn-outline' : 'btn-primary'}`} 
                        onClick={handleVerifyChain}
                        disabled={isVerifying}
                        style={{ padding: '12px 24px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', border: isVerifying ? '1px solid var(--accent-blue)' : '' }}
                    >
                        {isVerifying ? <FiRefreshCw className="spin" style={{ color: 'var(--accent-blue)' }} /> : <FiShield />}
                        {isVerifying ? 'Verifying Chain...' : 'Verify Integrity'}
                    </button>
                </div>
            </div>

            {verificationComplete && (
                <div className={`glass-card ${chainStatus?.valid ? 'green' : 'red'}`} style={{ marginBottom: '24px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', border: `1px solid ${chainStatus?.valid ? 'var(--accent-green)' : 'var(--accent-red)'}`, background: chainStatus?.valid ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                    <div style={{ fontSize: '32px', color: chainStatus?.valid ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {chainStatus?.valid ? <FiCheckCircle /> : <FiAlertTriangle />}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', color: chainStatus?.valid ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                            {chainStatus?.valid ? 'Chain Integrity Verified' : 'Tampering Detected!'}
                        </h3>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                            {chainStatus?.valid 
                                ? `All ${chainStatus.totalRecords} blocks successfully verified. No tampering detected.` 
                                : `CRITICAL WARNING: Tampering detected in ${tamperedBlocks.length} block(s). Chain is broken.`}
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
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

            {/* Hash Chain Records */}
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Hash Chain Explorer</h2>
                </div>
                
                <div className="hash-chain-list" style={{ position: 'relative', paddingLeft: '24px' }}>
                    {/* Continuous vertical line in the background for "full chain" feel */}
                    <div style={{ position: 'absolute', left: '47px', top: '24px', bottom: '24px', width: '2px', background: 'var(--border-glass)', zIndex: 0 }}></div>
                    
                    {records.map((r, i) => {
                        const isBeingVerified = currentlyVerifying === r.sequenceNumber;
                        const isTampered = tamperedBlocks.includes(r.sequenceNumber);
                        const isVerified = verificationComplete && !isTampered;
                        
                        let borderColor = 'var(--border-glass)';
                        let shadow = 'none';
                        let icon = <FiActivity />;
                        let iconColor = 'var(--text-muted)';
                        
                        if (isBeingVerified) {
                            borderColor = 'var(--accent-blue)';
                            shadow = '0 0 15px rgba(59, 130, 246, 0.4)';
                            icon = <FiRefreshCw className="spin" />;
                            iconColor = 'var(--accent-blue)';
                        } else if (isTampered) {
                            borderColor = 'var(--accent-red)';
                            shadow = '0 0 15px rgba(239, 68, 68, 0.3)';
                            icon = <FiXCircle />;
                            iconColor = 'var(--accent-red)';
                        } else if (isVerified) {
                            borderColor = 'var(--accent-green)';
                            icon = <FiCheckCircle />;
                            iconColor = 'var(--accent-green)';
                        }
                        
                        return (
                        <div key={r._id} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '24px', marginBottom: '24px' }}>
                            {/* Node icon connecting to the line */}
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-primary)', border: `2px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: iconColor, flexShrink: 0, boxShadow: shadow, transition: 'all 0.3s ease' }}>
                                {icon}
                            </div>
                            
                            <div className="hash-record glass-card" style={{ flex: 1, padding: '20px', border: `1px solid ${borderColor}`, boxShadow: shadow, transition: 'all 0.3s ease', opacity: (isVerifying && !isBeingVerified && !isTampered && !isVerified) ? 0.5 : 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div className="hash-record-number" style={{ fontSize: '18px', fontWeight: '600', color: isTampered ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                                        Block #{r.sequenceNumber}
                                        {isTampered && <span style={{ marginLeft: '12px', fontSize: '12px', padding: '2px 8px', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', borderRadius: '12px' }}>TAMPERED</span>}
                                        {isVerified && <span style={{ marginLeft: '12px', fontSize: '12px', padding: '2px 8px', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)', borderRadius: '12px' }}>VERIFIED</span>}
                                    </div>
                                    <div className="hash-record-type" style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '12px', fontWeight: '500', border: '1px solid var(--border-glass)' }}>
                                        {r.recordType?.replace(/_/g, ' ')}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
                                    <div className="hash-value" title="Record Hash" style={{ fontFamily: 'monospace', fontSize: '13px', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', wordBreak: 'break-all', color: isTampered ? 'var(--accent-red)' : 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>RECORD HASH:</span>
                                        {r.recordHash}
                                    </div>
                                    <div className="hash-value" title="Data Hash" style={{ fontFamily: 'monospace', fontSize: '13px', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', wordBreak: 'break-all', color: isTampered ? 'var(--accent-red)' : 'var(--accent-cyan)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>DATA HASH:</span>
                                        {r.dataHash}
                                    </div>
                                    <div className="hash-value" title="Previous Hash" style={{ fontFamily: 'monospace', fontSize: '13px', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', wordBreak: 'break-all', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>PREV HASH:</span>
                                        {r.previousHash}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                                        <span><FiShield style={{marginRight: '6px'}}/> By: {r.createdBy?.name || 'System'}</span>
                                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
                        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                        <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                        <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                )}
            </div>

            {/* Verify Single Record (moved to bottom) */}
            <div className="glass-card" style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>🔍 Verify a Specific Record</h3>
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
        </div>
    );
}

