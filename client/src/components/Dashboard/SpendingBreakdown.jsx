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
        <div className="premium-card">
            <h3 className="premium-card-label" style={{ color: 'white', marginBottom: '20px' }}>Spending Breakdown</h3>
            <div style={{ height: '300px', width: '100%' }}>
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
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        />
                        <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px', paddingLeft: '10px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
