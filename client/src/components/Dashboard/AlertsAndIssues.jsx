export default function AlertsAndIssues({ wards = [] }) {
    const fraudAlerts = wards
        .filter(w => w.spentBudget > w.allocatedBudget)
        .map(w => ({
            label: `CRITICAL FRAUD: Overspending in ${w.name}`,
            status: 'Anomaly',
            value: `Exceeds by ₹ ${(w.spentBudget - w.allocatedBudget).toLocaleString()}`,
            color: '#ef4444'
        }));

    const defaultAlerts = [
        { label: 'Unspent Funds in Padmanabhanagar', status: 'Pending', value: '₹ 700,000', color: 'var(--premium-blue)' },
        { label: 'Budget Utilization Warning', status: 'Notice', value: 'High Usage', color: 'var(--premium-orange)' },
    ];

    const displayAlerts = fraudAlerts.length > 0 ? [...fraudAlerts, ...defaultAlerts] : defaultAlerts;

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
