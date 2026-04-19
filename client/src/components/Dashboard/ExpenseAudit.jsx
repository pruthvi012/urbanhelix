import { FiCheckCircle, FiFileText } from 'react-icons/fi';

export default function ExpenseAudit({ items }) {
    const defaultItems = [
        { id: '#5678', type: 'Invoice', value: '11,500,000', status: 'verified' },
        { id: '#4321', type: 'Receipt', value: '2,500,000', status: 'verified' },
        { id: '#8765', type: 'Bill', value: '1,800,000', status: 'pending' },
    ];

    const displayItems = items || defaultItems;

    return (
        <div className="premium-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="premium-card-label" style={{ color: 'white' }}>Expense Audit</h3>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Target ₹ 12,000,000</div>
            </div>
            <div>
                {displayItems.map((item, idx) => (
                    <div key={idx} className="audit-item" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div className="item-icon" style={{ background: item.status === 'verified' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(56, 189, 248, 0.1)', color: item.status === 'verified' ? 'var(--premium-green)' : 'var(--premium-blue)' }}>
                                {item.status === 'verified' ? <FiCheckCircle /> : <FiFileText />}
                            </div>
                            <div>
                                <div className="item-title">{item.type} {item.id}</div>
                            </div>
                        </div>
                        <div style={{ fontWeight: '600', color: 'white', fontSize: '13px' }}>
                            ₹ {item.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
