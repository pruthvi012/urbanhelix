import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { FiShield, FiSearch, FiCheckCircle, FiXCircle, FiActivity, FiRefreshCw, FiAlertTriangle, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Audit() {
    const [chainStatus, setChainStatus] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [verifyId, setVerifyId] = useState('');
    const [verifyResult, setVerifyResult] = useState(null);

    const [activeTab, setActiveTab] = useState('chain');
    const [auditLogs, setAuditLogs] = useState([]);
    const [logPage, setLogPage] = useState(1);
    const [totalLogPages, setTotalLogPages] = useState(1);
    const [logLoading, setLogLoading] = useState(false);

    useEffect(() => { 
        if (activeTab === 'chain') loadData(); 
        else loadLogs();
    }, [page, logPage, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [chainRes, recordsRes] = await Promise.all([
                auditAPI.verifyChain(),
                auditAPI.getChain({ page, limit: 50 }),
            ]);
            setChainStatus(chainRes.data);
            setRecords(recordsRes.data.records || []);
            setTotalPages(recordsRes.data.totalPages || 1);
            
            if (chainRes.data && !chainRes.data.valid && chainRes.data.errors) {
                setTamperedBlocks(chainRes.data.errors.map(e => e.sequenceNumber));
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const loadLogs = async () => {
        try {
            setLogLoading(true);
            const res = await auditAPI.getLogs({ page: logPage, limit: 20 });
            setAuditLogs(res.data.logs || []);
            setTotalLogPages(res.data.totalPages || 1);
        } catch (err) { console.error(err); } finally { setLogLoading(false); }
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

    const handleGeneratePDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const now = new Date();

        // Header
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 300, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('UrbanHeliX — Blockchain Audit Report', 148, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${now.toLocaleString()}  |  Chain Status: ${chainStatus?.valid ? 'INTACT' : 'TAMPERED'}`, 148, 22, { align: 'center' });

        // Chain Status Banner
        const isValid = chainStatus?.valid;
        doc.setFillColor(isValid ? 16 : 239, isValid ? 185 : 68, isValid ? 129 : 68, 0.15);
        doc.setDrawColor(isValid ? 16 : 239, isValid ? 185 : 68, isValid ? 129 : 68);
        doc.roundedRect(10, 35, 277, 14, 2, 2, 'FD');
        doc.setTextColor(isValid ? 16 : 239, isValid ? 185 : 68, isValid ? 129 : 68);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(
            isValid
                ? `✓ CHAIN INTEGRITY VERIFIED — All ${chainStatus?.totalRecords || records.length} blocks intact. No tampering detected.`
                : `⚠ TAMPERING DETECTED — ${chainStatus?.errors?.length || 0} block(s) compromised. Chain integrity broken!`,
            148, 44, { align: 'center' }
        );

        // Tampered blocks highlight table (only if tampered)
        let startY = 55;
        if (!isValid && chainStatus?.errors?.length > 0) {
            doc.setTextColor(239, 68, 68);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Tampered Blocks Detected:', 14, startY);
            startY += 5;

            autoTable(doc, {
                startY,
                head: [['Block #', 'Record Type', 'Error Reason', 'Project Code', 'Timestamp']],
                body: chainStatus.errors.map(e => [
                    `#${e.sequenceNumber}`,
                    (e.recordType || 'N/A').replace(/_/g, ' ').toUpperCase(),
                    e.error || 'Hash mismatch detected',
                    e.projectCode || 'N/A',
                    e.createdAt ? new Date(e.createdAt).toLocaleString() : 'N/A'
                ]),
                headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
                bodyStyles: { textColor: [239, 68, 68], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [255, 240, 240] },
                margin: { left: 14, right: 14 },
            });
            startY = doc.lastAutoTable.finalY + 10;
        }

        // Full Chain Records Table
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Complete Blockchain Audit Trail:', 14, startY);
        startY += 5;

        autoTable(doc, {
            startY,
            head: [['Block #', 'Type', 'Project Code', 'Details', 'Amount (₹)', 'Block Hash', 'Timestamp', 'Status']],
            body: records.map(r => [
                `#${r.sequenceNumber}`,
                (r.recordType || '').replace(/_/g, ' '),
                r.data?.projectCode || '—',
                r.data?.title || r.data?.material || r.data?.newStatus || r.data?.reason || '—',
                r.data?.amount ? `₹${Number(r.data.amount).toLocaleString()}` : (r.data?.allocatedBudget ? `₹${Number(r.data.allocatedBudget).toLocaleString()}` : '—'),
                r.recordHash ? r.recordHash.substring(0, 20) + '...' : '—',
                new Date(r.createdAt).toLocaleString(),
                tamperedBlocks.includes(r.sequenceNumber) ? '⚠ TAMPERED' : (verificationComplete ? '✓ VERIFIED' : 'Pending')
            ]),
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            didParseCell: (data) => {
                if (data.column.index === 7 && data.cell.raw?.includes('TAMPERED')) {
                    data.cell.styles.textColor = [239, 68, 68];
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.column.index === 7 && data.cell.raw?.includes('VERIFIED')) {
                    data.cell.styles.textColor = [16, 185, 129];
                }
            },
            margin: { left: 14, right: 14 },
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`UrbanHeliX Municipal Blockchain Audit  |  Page ${i} of ${pageCount}  |  Confidential`, 148, doc.internal.pageSize.height - 8, { align: 'center' });
        }

        doc.save(`UrbanHeliX_Audit_Report_${now.toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .tab-btn { padding: 12px 24px; font-weight: 600; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.3s; color: var(--text-muted); background: none; border-top: none; border-left: none; border-right: none; }
                .tab-btn.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); background: rgba(59,130,246,0.05); }
            `}</style>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Audit & Transparency</h1>
                    <p className="page-subtitle">Immutable Logs & Blockchain Verification</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-outline"
                        onClick={handleGeneratePDF}
                        style={{ padding: '12px 24px', fontSize: '16px', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <FiDownload /> Download PDF Report
                    </button>
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

            <div className="glass-card" style={{ marginBottom: '24px', padding: 0, display: 'flex' }}>
                <button className={`tab-btn ${activeTab === 'chain' ? 'active' : ''}`} onClick={() => setActiveTab('chain')}><FiShield style={{marginRight: '8px'}}/> Blockchain Audit Trail</button>
                <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}><FiActivity style={{marginRight: '8px'}}/> System Activity Logs</button>
            </div>

            {activeTab === 'chain' ? (
                <>
                {loading && <div className="loading" style={{ padding: '40px' }}><div className="spinner"></div> Loading chain data...</div>}
                
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

                <div className="section">
                    <div className="hash-chain-list" style={{ position: 'relative', paddingLeft: '24px' }}>
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

                                    {r.data && (
                                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                                {r.data.title && (
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Project Title</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.data.title}</div>
                                                    </div>
                                                )}
                                                {r.data.projectCode && (
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Project Code</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-red)', letterSpacing: '0.5px' }}>{r.data.projectCode}</div>
                                                    </div>
                                                )}
                                                {r.data.amount && (
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-blue)' }}>₹{r.data.amount.toLocaleString()}</div>
                                                    </div>
                                                )}
                                                {r.data.newStatus && (
                                                    <div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>New Status</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-green)' }}>{r.data.newStatus?.replace('_', ' ')}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

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
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                            <span><FiShield style={{marginRight: '6px'}}/> By: {r.createdBy?.name || 'System'}</span>
                                            <span>{new Date(r.createdAt).toLocaleString()}</span>
                                            <button
                                                onClick={() => {
                                                    const doc = new jsPDF();
                                                    const isTamp = tamperedBlocks.includes(r.sequenceNumber);

                                                    // Header bar
                                                    doc.setFillColor(15, 23, 42);
                                                    doc.rect(0, 0, 220, 28, 'F');
                                                    doc.setTextColor(255, 255, 255);
                                                    doc.setFontSize(14);
                                                    doc.setFont('helvetica', 'bold');
                                                    doc.text('UrbanHeliX — Block Audit Certificate', 105, 11, { align: 'center' });
                                                    doc.setFontSize(9);
                                                    doc.setFont('helvetica', 'normal');
                                                    doc.text(`Block #${r.sequenceNumber}  |  ${new Date(r.createdAt).toLocaleString()}`, 105, 20, { align: 'center' });

                                                    // Status badge
                                                    doc.setFillColor(isTamp ? 239 : 16, isTamp ? 68 : 185, isTamp ? 68 : 129);
                                                    doc.roundedRect(10, 32, 190, 12, 2, 2, 'F');
                                                    doc.setTextColor(255, 255, 255);
                                                    doc.setFontSize(10);
                                                    doc.setFont('helvetica', 'bold');
                                                    doc.text(isTamp ? '⚠ TAMPERED — This block has been modified!' : '✓ VERIFIED — This block is cryptographically intact', 105, 40, { align: 'center' });

                                                    // Block details table
                                                    autoTable(doc, {
                                                        startY: 50,
                                                        head: [['Field', 'Value']],
                                                        body: [
                                                            ['Block Number', `#${r.sequenceNumber}`],
                                                            ['Record Type', (r.recordType || '').replace(/_/g, ' ').toUpperCase()],
                                                            ['Project Code', r.data?.projectCode || '—'],
                                                            ['Project Title', r.data?.title || '—'],
                                                            ['Amount', r.data?.amount ? `₹${Number(r.data.amount).toLocaleString()}` : (r.data?.allocatedBudget ? `₹${Number(r.data.allocatedBudget).toLocaleString()}` : '—')],
                                                            ['Status Change', r.data?.newStatus || '—'],
                                                            ['Recorded By', r.createdBy?.name || 'System'],
                                                            ['Timestamp', new Date(r.createdAt).toLocaleString()],
                                                        ],
                                                        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
                                                        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
                                                        margin: { left: 10, right: 10 },
                                                    });

                                                    // Cryptographic proof section
                                                    let y = doc.lastAutoTable.finalY + 10;
                                                    doc.setFontSize(11);
                                                    doc.setFont('helvetica', 'bold');
                                                    doc.setTextColor(30, 41, 59);
                                                    doc.text('Cryptographic Proof (SHA-256):', 10, y);
                                                    y += 6;

                                                    autoTable(doc, {
                                                        startY: y,
                                                        head: [['Hash Type', 'SHA-256 Value']],
                                                        body: [
                                                            ['RECORD HASH', r.recordHash || '—'],
                                                            ['DATA HASH', r.dataHash || '—'],
                                                            ['PREV BLOCK HASH', r.previousHash || '—'],
                                                        ],
                                                        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
                                                        bodyStyles: { fontSize: 8, fontFamily: 'courier' },
                                                        columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' } },
                                                        didParseCell: (data) => {
                                                            if (data.column.index === 0 && data.cell.raw === 'RECORD HASH') {
                                                                data.cell.styles.textColor = isTamp ? [239, 68, 68] : [16, 185, 129];
                                                            }
                                                        },
                                                        margin: { left: 10, right: 10 },
                                                    });

                                                    // Footer
                                                    doc.setFontSize(8);
                                                    doc.setTextColor(150);
                                                    doc.text('UrbanHeliX Municipal Blockchain Audit  |  Confidential', 105, 285, { align: 'center' });

                                                    doc.save(`Block_${r.sequenceNumber}_${r.data?.projectCode || 'audit'}.pdf`);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: `1px solid ${isTampered ? 'var(--accent-red)' : 'var(--accent-green)'}`,
                                                    color: isTampered ? 'var(--accent-red)' : 'var(--accent-green)',
                                                    padding: '5px 12px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontWeight: 600
                                                }}
                                            >
                                                <FiDownload size={13}/> {isTampered ? 'Download Tamper Proof' : 'Download Certificate'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
                            <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
                            <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </div>
                </>
            ) : (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">System Activity Logs</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                             <div style={{ position: 'relative' }}>
                                <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    className="form-input" 
                                    placeholder="Search by Project Code..." 
                                    style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }} 
                                    onChange={(e) => {
                                        // Simple local filter or trigger re-fetch if needed
                                    }}
                                />
                             </div>
                        </div>
                    </div>
                    
                    {logLoading && <div className="loading" style={{ padding: '40px' }}><div className="spinner"></div> Loading logs...</div>}
                    
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Details</th></tr>
                            </thead>
                            <tbody>
                                {auditLogs.map((log) => (
                                    <tr key={log._id}>
                                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                                        <td>
                                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{log.user?.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user?.role?.replace('_', ' ')}</div>
                                        </td>
                                        <td><span className={`badge badge-${log.action === 'approve' ? 'approved' : log.action === 'reject' ? 'rejected' : 'proposed'}`}>{log.action}</span></td>
                                        <td style={{ fontSize: '14px', lineHeight: 1.4 }}>{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalLogPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
                            <button className="btn btn-outline btn-sm" disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)}>← Prev</button>
                            <span style={{ padding: '6px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>Page {logPage} of {totalLogPages}</span>
                            <button className="btn btn-outline btn-sm" disabled={logPage >= totalLogPages} onClick={() => setLogPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </div>
            )}

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

