import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function BudgetUtilization({ data }) {
    const defaultData = [
        { name: 'Lakkasandra', allocated: 8000, released: 7000, spent: 4000 },
        { name: 'Adugodi', allocated: 7500, released: 4500, spent: 3000 },
        { name: 'Koramangala', allocated: 8500, released: 5500, spent: 4500 },
    ];

    const chartData = data || defaultData;

    return (
        <div className="premium-card">
            <h3 className="premium-card-label" style={{ color: 'white', marginBottom: '20px' }}>Budget Utilization</h3>
            <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `${val/1000}K`} />
                        <Tooltip 
                            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
                        <Bar dataKey="allocated" name="Allocated" fill="var(--premium-green)" radius={[4, 4, 0, 0]} barSize={15} />
                        <Bar dataKey="released" name="Released" fill="var(--premium-blue)" radius={[4, 4, 0, 0]} barSize={15} />
                        <Bar dataKey="spent" name="Spent" fill="var(--premium-orange)" radius={[4, 4, 0, 0]} barSize={15} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
