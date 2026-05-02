import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BudgetUtilization({ data }) {
    const defaultData = [
        { name: 'Lakkasandra', allocated: 8000, released: 7000, spent: 4000 },
        { name: 'Adugodi', allocated: 7500, released: 4500, spent: 3000 },
        { name: 'Koramangala', allocated: 8500, released: 5500, spent: 4500 },
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
                <h3 className="premium-card-label" style={{ color: 'white', margin: 0 }}>📊 Budget Utilization</h3>
            </div>
            <div style={{ padding: '0 20px 20px', height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `${val/1000}K`} />
                        <Tooltip 
                            contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', color: '#64748b' }} />
                        <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                        <Bar dataKey="released" name="Released" fill="#eab308" radius={[4, 4, 0, 0]} barSize={15} />
                        <Bar dataKey="spent" name="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={15} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
