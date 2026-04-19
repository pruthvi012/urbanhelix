import { FiBriefcase, FiDollarSign, FiBarChart2, FiPieChart } from 'react-icons/fi';

export default function SummaryCards({ stats }) {
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
            label: 'Transparency Score',
            value: '82%',
            icon: <FiPieChart />,
            color: 'var(--premium-gradient-teal)',
            id: 'transparency',
            isProgress: true
        }
    ];

    return (
        <div className="summary-grid">
            {cards.map((card) => (
                <div key={card.id} className="premium-card">
                    <div className="premium-card-header">
                        <span className="premium-card-label">{card.label}</span>
                        <div className="premium-card-icon" style={{ background: card.color }}>
                            {card.icon}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div className="premium-card-value">{card.value}</div>
                        {card.isProgress && (
                            <div className="circular-progress-container">
                                <svg width="60" height="60" viewBox="0 0 60 60">
                                    <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                                    <circle cx="30" cy="30" r="25" fill="none" stroke="var(--premium-teal)" strokeWidth="5" 
                                            strokeDasharray="157" strokeDashoffset="28" strokeLinecap="round" />
                                </svg>
                                <span className="circular-progress-text">82%</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
