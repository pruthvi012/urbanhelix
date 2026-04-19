export default function FundAllocationStatus({ percentage = 75 }) {
    return (
        <div className="premium-card">
            <h3 className="premium-card-label" style={{ color: 'white', marginBottom: '20px' }}>Fund Allocation Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="url(#blueGradient)" strokeWidth="10" 
                                strokeDasharray="264" strokeDashoffset={264 - (264 * percentage / 100)} strokeLinecap="round" 
                                transform="rotate(-90 50 50)" />
                        <defs>
                            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#4ade80" />
                                <stop offset="100%" stopColor="#38bdf8" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'white' }}>{percentage}%</div>
                    </div>
                </div>
                
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Funds Utilized</span>
                    </div>
                    <div style={{ height: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ 
                            height: '100%', 
                            width: `${percentage}%`, 
                            background: 'linear-gradient(to right, #4ade80, #38bdf8)',
                            borderRadius: '15px',
                            boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)'
                        }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
