import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316'];

export default function Analytics() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await auditAPI.getAnalytics();
            setAnalytics(res.data.analytics);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
        return `₹${value?.toLocaleString()}`;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</p>
                    {payload.map((p, i) => (
                        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 10000 ? formatCurrency(p.value) : p.value}</p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading analytics...</div>;
    if (!analytics) return <div className="empty-state">No analytics data available</div>;

    // Prepare department spending data
    const deptData = (analytics.departmentSpending || []).map(d => ({
        name: d.name?.replace('&', '').substring(0, 15),
        totalBudget: d.totalBudget || 0,
        allocated: d.allocatedBudget || 0,
        spent: d.spentBudget || 0,
    }));

    // Prepare project status data
    const statusData = (analytics.projectsByStatus || []).map(s => ({
        name: s._id?.replace('_', ' ') || 'Unknown',
        value: s.count,
        budget: s.totalBudget,
    }));

    // Prepare category data
    const categoryData = (analytics.projectsByCategory || []).map(c => ({
        name: c._id?.replace('_', ' ') || 'Unknown',
        projects: c.count,
        budget: c.totalBudget,
    }));

    // Hash chain stat data
    const chainData = (analytics.hashChainStats || []).map(c => ({
        name: c._id?.replace(/_/g, ' ') || 'Unknown',
        count: c.count,
    }));

    // Monthly fund flow data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const fundFlowData = (analytics.monthlyFundFlow || []).map(f => ({
        name: `${monthNames[f._id.month - 1]} ${f._id.year}`,
        amount: f.totalAmount,
        count: f.count,
    }));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Analytics & Reports</h1>
                <p className="page-subtitle">Municipal fund utilization and project performance insights</p>
            </div>

            <div className="grid-2">
                {/* Department Spending */}
                <div className="chart-container">
                    <h3 className="chart-title">Department-wise Budget Utilization</h3>
                    {deptData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={formatCurrency} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="totalBudget" name="Total Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="allocated" name="Allocated" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="spent" name="Spent" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state">No department data</div>}
                </div>

                {/* Project Status Distribution */}
                <div className="chart-container">
                    <h3 className="chart-title">Project Status Distribution</h3>
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state">No project data</div>}
                </div>

                {/* Category Distribution */}
                <div className="chart-container">
                    <h3 className="chart-title">Projects by Category</h3>
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} width={100} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="projects" name="Projects" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state">No category data</div>}
                </div>

                {/* Hash Chain Activity */}
                <div className="chart-container">
                    <h3 className="chart-title">Blockchain Record Activity</h3>
                    {chainData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chainData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Records" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state">No blockchain data</div>}
                </div>

                {/* Monthly Fund Flow */}
                <div className="chart-container" style={{ gridColumn: 'span 2' }}>
                    <h3 className="chart-title">Monthly Fund Flow (Expenditure)</h3>
                    {fundFlowData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={fundFlowData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={formatCurrency} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="amount" name="Total Amount" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981' }} activeDot={{ r: 8 }} />
                                <Line type="monotone" dataKey="count" name="Transaction Count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state">No historical fund flow data</div>}
                </div>
            </div>
        </div>
    );
}
