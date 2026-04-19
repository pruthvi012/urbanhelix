export default function WardOverview({ wards }) {
    const defaultWards = [
        { name: 'Lakkasandra', id: 'Ward 146', budget: '12M', released: '10M', spent: '9.5M' },
        { name: 'Adugodi', id: 'Ward 147', budget: '10M', released: '8.5M', spent: '7.8M' },
        { name: 'Koramangala', id: 'Ward 151', budget: '15M', released: '13M', spent: '11.5M' }
    ];

    const displayWards = (wards && wards.length > 0) ? wards.slice(0, 3) : defaultWards;

    return (
        <div className="premium-card" style={{ padding: '0' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="premium-card-label" style={{ color: 'white' }}>Ward Overview</h3>
            </div>
            <div style={{ padding: '16px' }}>
                {displayWards.map((ward, idx) => (
                    <div key={idx} className="ward-card">
                        <div className="ward-info">
                            <h4>{ward.name} <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>{ward.id}</span></h4>
                            <p>Governance performance: High</p>
                        </div>
                        <div className="ward-stats">
                            <div>
                                <span className="ward-stat-label">Budget: </span>
                                <span className="ward-stat-value">₹ {ward.budget}</span>
                            </div>
                            <div>
                                <span className="ward-stat-label">Released: </span>
                                <span className="ward-stat-value">₹ {ward.released}</span>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <span className="ward-stat-label">Spent: </span>
                                <span className="ward-stat-value" style={{ color: 'var(--premium-orange)' }}>₹ {ward.spent}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
