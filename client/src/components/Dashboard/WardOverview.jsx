import React from 'react';
import { FiMapPin } from 'react-icons/fi';

export default function WardOverview({ wards }) {
    const defaultWards = [
        { wardNo: 156, name: 'Kempapura Agrahara', assembly: 'Vijayanagar', budget: '1.5Cr', released: '1.2Cr', spent: '0.8Cr', status: 'stable' },
        { wardNo: 198, name: 'J P Nagar', assembly: 'Jayanagar', budget: '4.0Cr', released: '3.5Cr', spent: '3.2Cr', status: 'stable' },
        { wardNo: 172, name: 'Chickpet', assembly: 'Chickpet', budget: '2.8Cr', released: '2.2Cr', spent: '2.5Cr', status: 'anomaly' },
        { wardNo: 186, name: 'Koramangala', assembly: 'BTM Layout', budget: '2.5Cr', released: '2.2Cr', spent: '2.0Cr', status: 'stable' },
    ];

    const displayWards = (wards && wards.length > 0) ? wards : defaultWards;

    const formatCurrency = (val) => {
        if (typeof val === 'string') return `₹${val}`;
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${val?.toLocaleString()}`;
    };

    return (
        <div className="premium-card" style={{ 
            padding: '30px', 
            background: 'rgba(30, 41, 59, 0.4)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: '24px',
            color: '#f8fafc',
            height: '100%',
            overflow: 'hidden'
        }}>
            <div className="chart-header" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="chart-icon-box purple" style={{ width: '45px', height: '45px', fontSize: '20px' }}>
                    <FiMapPin />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Ward Performance</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Real-time monitoring of all {displayWards.length} wards</p>
                </div>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                {displayWards.map((w, idx) => {
                    const isAnomaly = w.status === 'anomaly' || (w.spentBudget > w.allocatedBudget);
                    return (
                        <div key={idx} style={{ 
                            marginBottom: '16px', 
                            background: 'rgba(255, 255, 255, 0.02)', 
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '16px',
                            padding: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ 
                                        background: '#6366f1', 
                                        color: 'white', 
                                        padding: '2px 8px', 
                                        borderRadius: '6px', 
                                        fontSize: '11px', 
                                        fontWeight: 800 
                                    }}>
                                        #{w.wardNo || idx + 101}
                                    </span>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{w.name}</h4>
                                </div>
                                <div style={{ 
                                    fontSize: '10px', 
                                    fontWeight: 700, 
                                    textTransform: 'uppercase',
                                    color: isAnomaly ? '#ef4444' : '#10b981',
                                    background: isAnomaly ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                }}>
                                    {isAnomaly ? 'Anomaly' : 'Stable'}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Budget</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{formatCurrency(w.totalBudget || w.budget)}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Released</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0ea5e9' }}>{formatCurrency(w.totalReleasedFunds || w.released)}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Spent</div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: isAnomaly ? '#ef4444' : '#10b981' }}>{formatCurrency(w.spentBudget || w.spent)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
