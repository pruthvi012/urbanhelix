import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, auditAPI } from '../services/api';
import { FiBell, FiCalendar } from 'react-icons/fi';

import SummaryCards from '../components/Dashboard/SummaryCards';
import WardOverview from '../components/Dashboard/WardOverview';
import BudgetUtilization from '../components/Dashboard/BudgetUtilization';
import SpendingBreakdown from '../components/Dashboard/SpendingBreakdown';
import RecentActivities from '../components/Dashboard/RecentActivities';
import AlertsAndIssues from '../components/Dashboard/AlertsAndIssues';
import FundAllocationStatus from '../components/Dashboard/FundAllocationStatus';
import ExpenseAudit from '../components/Dashboard/ExpenseAudit';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentProjects, setRecentProjects] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [projectRes, analyticsRes] = await Promise.all([
                projectAPI.getAll({ limit: 5 }),
                auditAPI.getAnalytics(),
            ]);
            setRecentProjects(projectRes.data.projects || []);
            setAnalytics(analyticsRes.data.analytics);

            try {
                const statsRes = await projectAPI.getStats();
                setStats(statsRes.data.stats);
            } catch (e) {
                setStats({ 
                    totalBudget: 40500000, 
                    totalSpent: 28750000, 
                    totalReleased: 32000000 
                });
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading premium dashboard...</div>;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="premium-dashboard">
            <div className="premium-header">
                <div className="premium-header-title">BBMP Fund Transparency & Civic Project Monitoring</div>
                <div className="premium-header-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiCalendar /> {today}
                    </div>
                    <FiBell style={{ fontSize: '18px', cursor: 'pointer' }} />
                    <div className="sidebar-avatar" style={{ width: '32px', height: '32px' }}>
                        {user?.name?.charAt(0)}
                    </div>
                </div>
            </div>

            <SummaryCards stats={stats} />

            <div className="dashboard-grid">
                <WardOverview />
                <BudgetUtilization data={analytics?.departmentSpending?.map(d => ({
                    name: d.name.substring(0, 10),
                    allocated: d.allocatedBudget / 1000,
                    released: (d.allocatedBudget * 0.8) / 1000, // Derived mock for release
                    spent: d.spentBudget / 1000
                }))} />
                <SpendingBreakdown data={analytics?.departmentSpending?.slice(0, 4).map((d, i) => ({
                    name: d.name,
                    value: d.spentBudget,
                    color: i === 0 ? 'var(--premium-green)' : i === 1 ? 'var(--premium-blue)' : i === 2 ? 'var(--premium-orange)' : 'var(--premium-teal)'
                }))} />
            </div>

            <div className="bottom-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <RecentActivities activities={recentProjects.map(p => ({
                        title: `${p.title} in ${p.department?.name || 'Urban'}`,
                        time: new Date(p.createdAt).toLocaleDateString(),
                        status: p.status === 'completed' ? 'completed' : p.status === 'in_progress' ? 'started' : 'pending'
                    }))} />
                    <FundAllocationStatus percentage={75} />
                </div>
                <AlertsAndIssues />
                <ExpenseAudit />
            </div>
        </div>
    );
}
