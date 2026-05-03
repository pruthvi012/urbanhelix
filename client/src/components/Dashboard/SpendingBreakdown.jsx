import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FiPieChart } from 'react-icons/fi';

export default function SpendingBreakdown({ data }) {
    const defaultData = [
        { name: 'Roads & Infra', value: 45000000, color: '#6366f1' },
        { name: 'Water Supply', value: 32000000, color: '#0ea5e9' },
        { name: 'Electricity', value: 18000000, color: '#f59e0b' },
        { name: 'Sanitation', value: 12000000, color: '#10b981' },
        { name: 'Parks', value: 8000000, color: '#ec4899' }
    ];

    const chartData = data || defaultData;

    return (
        <div className="premium-card" style={{ 
            padding: '30px', 
            background: 'rgba(30, 41, 59, 0.4)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: '24px',
            color: '#f8fafc',
            height: '100%'
        }}>
            <div className="chart-header" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="chart-icon-box blue" style={{ width: '45px', height: '45px', fontSize: '20px' }}>
                    <FiPieChart />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Spending Distribution</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Allocated budget by work category</p>
                </div>
            </div>

            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ 
                                background: 'rgba(15, 23, 42, 0.9)', 
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                borderRadius: '12px', 
                                color: '#fff',
                                backdropFilter: 'blur(10px)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value) => `₹${(value / 10000000).toFixed(1)} Cr`}
                        />
                        <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" 
                                wrapperStyle={{ fontSize: '11px', paddingTop: '20px', color: '#94a3b8' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
