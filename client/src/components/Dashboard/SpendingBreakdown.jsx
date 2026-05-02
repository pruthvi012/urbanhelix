import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function SpendingBreakdown({ data }) {
    const defaultData = [
        { name: 'Roads', value: 40, color: 'var(--premium-green)' },
        { name: 'Lighting', value: 25, color: 'var(--premium-blue)' },
        { name: 'Other', value: 20, color: 'var(--premium-orange)' },
        { name: 'Other Dept', value: 15, color: 'var(--premium-teal)' }
    ];

    const chartData = data || defaultData;

    return (
        <div className="premium-card" style={{ 
            padding: '0', 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            color: '#0f172a',
            overflow: 'hidden'
        }}>
            <div style={{ padding: '16px 20px', background: '#b91c1c', marginBottom: '20px' }}>
                <h3 className="premium-card-label" style={{ color: 'white', margin: 0 }}>🍰 Spending Breakdown</h3>
            </div>
            <div style={{ padding: '0 20px 20px', height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                        />
                        <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px', paddingLeft: '10px', color: '#64748b' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
