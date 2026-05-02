import { FiBriefcase, FiDollarSign, FiBarChart2, FiPieChart, FiMapPin } from 'react-icons/fi';

export default function SummaryCards({ stats, wardCount }) {
    const formatCurrency = (amt) => {
        if (!amt) return '₹0';
        return `₹${amt.toLocaleString()}`;
    };

    const cards = [
        {
            label: 'Total Budget Allocated',
            value: formatCurrency(stats?.totalBudget || 40500000),
            icon: <FiBriefcase />,
            color: 'var(--premium-gradient-blue)',
            id: 'budget'
        },
        {
            label: 'Funds Released',
            value: formatCurrency(stats?.totalReleased || 32000000),
            icon: <FiDollarSign />,
            color: 'var(--premium-gradient-green)',
            id: 'released'
        },
        {
            label: 'Funds Spent',
            value: formatCurrency(stats?.totalSpent || 28750000),
            icon: <FiBarChart2 />,
            color: 'var(--premium-gradient-orange)',
            id: 'spent'
        },
        {
            label: 'Total Wards Monitoring',
            value: wardCount || '48',
            icon: <FiMapPin />,
            color: 'var(--premium-gradient-purple)',
            id: 'wards'
        },
        {
            label: 'Transparency Score',
            value: '92%',
            icon: <FiPieChart />,
            color: 'var(--premium-gradient-teal)',
            id: 'transparency',
            isProgress: true
        }
    ];

    return (
        <div className="summary-grid">
            {cards.map((card) => (
                <div key={card.id} className="premium-card" style={{ 
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '24px',
                    borderRadius: '24px'
                }}>
                    <div className="premium-card-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="premium-card-icon" style={{ 
                            background: card.id === 'budget' ? 'rgba(59, 130, 246, 0.2)' : 
                                        card.id === 'released' ? 'rgba(16, 185, 129, 0.2)' : 
                                        card.id === 'spent' ? 'rgba(239, 68, 68, 0.2)' : 
                                        card.id === 'wards' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                            color: card.id === 'budget' ? '#60a5fa' : 
                                   card.id === 'released' ? '#34d399' : 
                                   card.id === 'spent' ? '#f87171' : 
                                   card.id === 'wards' ? '#fbbf24' : '#60a5fa',
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            boxShadow: card.id === 'spent' ? '0 0 20px rgba(239, 68, 68, 0.2)' : 'none'
                        }}>
                            {card.icon}
                        </div>
                        <span className="premium-card-label" style={{ 
                            color: '#94a3b8', 
                            fontSize: '13px', 
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>{card.label}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div className="premium-card-value" style={{ 
                                color: '#f8fafc', 
                                fontSize: '32px', 
                                fontWeight: 900,
                                letterSpacing: '-1px',
                                marginBottom: '4px'
                            }}>{card.value}</div>
                            <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                ⚡ <span style={{ color: '#94a3b8', fontWeight: 500 }}>Live Analysis</span>
                            </div>
                        </div>
                        {card.isProgress && (
                            <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                                <svg width="56" height="56" viewBox="0 0 56 56">
                                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                                    <circle cx="28" cy="28" r="24" fill="none" stroke="#f59e0b" strokeWidth="6" 
                                            strokeDasharray="150" strokeDashoffset="25" strokeLinecap="round" />
                                </svg>
                                <span style={{ 
                                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                    fontSize: '11px', fontWeight: 800, color: '#f59e0b'
                                }}>92%</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
