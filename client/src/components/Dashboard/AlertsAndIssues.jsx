export default function AlertsAndIssues({ alerts }) {
    const defaultAlerts = [
        { label: 'Unspent Funds in Adugodi', status: 'Pending', value: '₹ 700,000', color: 'var(--premium-orange)' },
        { label: 'Delayed Project in Koramangala', status: '15 Days Overdue', value: '', color: '#f87171' },
        { label: 'Overspending in Ward 146', status: 'Excess', value: '₹ 500,000', color: 'var(--premium-blue)' },
    ];

    const displayAlerts = alerts || defaultAlerts;

    return (
        <div className="premium-card">
            <h3 className="premium-card-label" style={{ color: 'white', marginBottom: '20px' }}>Alerts & Issues</h3>
            <div>
                {displayAlerts.map((alert, idx) => (
                    <div key={idx} className="activity-item" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: alert.color, marginRight: '12px' }}></div>
                            <div className="item-title" style={{ fontSize: '13px' }}>{alert.label}</div>
                        </div>
                        <div className="item-status" style={{ background: `${alert.color}20`, color: alert.color, border: `1px solid ${alert.color}40` }}>
                            {alert.status} {alert.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
