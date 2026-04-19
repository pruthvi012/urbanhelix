import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiFolder, FiCheckSquare, FiDollarSign, FiAlertCircle, FiShield, FiBarChart2, FiLogOut, FiUsers } from 'react-icons/fi';

const NAV_ITEMS = {
    citizen: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/grievances', icon: <FiAlertCircle />, label: 'Grievances' },
        { to: '/audit', icon: <FiShield />, label: 'Public Audit' },
        { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    ],
    engineer: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/milestones', icon: <FiCheckSquare />, label: 'Milestones' },
        { to: '/funds', icon: <FiDollarSign />, label: 'Fund Transactions' },
        { to: '/grievances', icon: <FiAlertCircle />, label: 'Grievances' },
        { to: '/audit', icon: <FiShield />, label: 'Audit Chain' },
        { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    ],
    contractor: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'My Projects' },
        { to: '/milestones', icon: <FiCheckSquare />, label: 'Milestones' },
        { to: '/funds', icon: <FiDollarSign />, label: 'Payments' },
    ],
    financial_officer: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/milestones', icon: <FiCheckSquare />, label: 'Milestones' },
        { to: '/funds', icon: <FiDollarSign />, label: 'Fund Verification' },
        { to: '/audit', icon: <FiShield />, label: 'Audit Chain' },
        { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    ],
    admin: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/milestones', icon: <FiCheckSquare />, label: 'Milestones' },
        { to: '/funds', icon: <FiDollarSign />, label: 'Fund Transactions' },
        { to: '/grievances', icon: <FiAlertCircle />, label: 'Grievances' },
        { to: '/audit', icon: <FiShield />, label: 'Audit Chain' },
        { to: '/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    ],
};

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.citizen;
    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
    const roleLabel = (user?.role || '').replace('_', ' ');

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <NavLink to="/" className="sidebar-logo">
                        <div className="sidebar-logo-icon">🏛️</div>
                        <div>
                            <div className="sidebar-logo-text">UrbanHeliX</div>
                            <div className="sidebar-logo-sub">Municipal Governance</div>
                        </div>
                    </NavLink>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section-title">Navigation</div>
                    {navItems.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.name}</div>
                        <div className="sidebar-user-role">{roleLabel}</div>
                    </div>
                    <button className="btn-logout" onClick={handleLogout} title="Logout">
                        <FiLogOut />
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
