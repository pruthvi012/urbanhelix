import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    FiGrid, FiFolder, FiDollarSign, FiMessageSquare, FiShield, 
    FiSearch, FiBell, FiChevronDown, FiChevronUp, FiMenu, FiX, 
    FiLogOut, FiActivity, FiGlobe, FiTool, FiBriefcase, FiUserCheck
} from 'react-icons/fi';
import ChatBot from './ChatBot';
import NotificationBell from './NotificationBell';
import RealTimeNotifications from './RealTimeNotifications';

const ROLES = [
    { key: 'citizen', label: 'Citizen', desc: 'Municipal command center', email: 'ananya@citizen.com', icon: <FiGlobe /> },
    { key: 'contractor', label: 'Contractor', desc: 'Civil works execution', email: 'vikram@contractor.com', icon: <FiBriefcase /> },
    { key: 'engineer', label: 'Site Engineer', desc: 'Technical & field audit', email: 'rajesh.engineer@urbanhelix.gov', icon: <FiTool /> },
    { key: 'financial_officer', label: 'Financial Officer', desc: 'Treasury & escrow release', email: 'sunita.finance@urbanhelix.gov', icon: <FiDollarSign /> },
    { key: 'admin', label: 'City Admin', desc: 'Municipal governance', email: 'admin@urbanhelix.gov', icon: <FiUserCheck /> }
];

const NAV_LINKS = [
    { to: '/', label: 'Overview', icon: <FiGrid /> },
    { to: '/projects', label: 'Projects', icon: <FiFolder /> },
    { to: '/funds', label: 'Finance & Escrow', icon: <FiDollarSign /> },
    { to: '/grievances', label: 'Grievances', icon: <FiMessageSquare /> },
    { to: '/audit', label: 'Audit Trail', icon: <FiShield />, hideForRoles: ['contractor', 'financial_officer'] }
];

export default function Layout() {
    const { user, login, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [switchingRole, setSwitchingRole] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleRoleSwitch = async (roleObj) => {
        if (user?.role === roleObj.key) {
            setShowRoleDropdown(false);
            return;
        }
        setSwitchingRole(true);
        try {
            await login(roleObj.email, 'password123');
            setShowRoleDropdown(false);
        } catch (err) {
            console.error('Role switch error:', err);
        } finally {
            setSwitchingRole(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Get current breadcrumb page name
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/') return 'Overview';
        if (path.startsWith('/projects/')) return 'Project Details';
        if (path.startsWith('/projects')) return 'Projects';
        if (path.startsWith('/funds')) return 'Finance & Escrow';
        if (path.startsWith('/grievances')) return 'Grievances';
        if (path.startsWith('/audit')) return 'Audit Trail';
        if (path.startsWith('/milestones')) return 'Milestones';
        if (path.startsWith('/expenses')) return 'Contractor Expenses';
        if (path.startsWith('/analytics')) return 'Analytics';
        return 'City operations';
    };

    const currentRoleObj = ROLES.find(r => r.key === user?.role) || ROLES[0];
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AK';
    const visibleNavLinks = NAV_LINKS.filter((item) => !(item.hideForRoles || []).includes(user?.role));

    return (
        <div className="app-layout">
            {/* ─── DARK GREEN / TEAL SIDEBAR ─── */}
            <aside className={`sidebar ${showMobileMenu ? 'open' : ''}`}>
                {/* Logo Branding */}
                <div className="sidebar-header">
                    <NavLink to="/" className="sidebar-logo">
                        <div className="sidebar-logo-icon-box">
                            <FiActivity />
                        </div>
                        <span className="sidebar-logo-title">UrbanHelix</span>
                    </NavLink>
                </div>

                {/* Current Role Card */}
                <div className="role-card-container">
                    <div className="role-switcher-card" style={{ cursor: 'default' }}>
                        <div className="role-avatar-badge">
                            {initials}
                        </div>
                        <div className="role-info-text">
                            <div className="role-name">{currentRoleObj.label}</div>
                            <div className="role-desc">{currentRoleObj.desc}</div>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="sidebar-nav">
                    {visibleNavLinks.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setShowMobileMenu(false)}
                        >
                            <div className="sidebar-nav-item-left">
                                <span className="icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </div>
                            {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom Quick Logout */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--sidebar-border)' }}>
                    <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '13px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            transition: 'var(--transition)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
                    >
                        <FiLogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ─── MAIN CONTENT AREA (LIGHT THEME) ─── */}
            <main className="main-content">
                {/* Top Navigation Header */}
                <header className="main-header">
                    {/* Left: Breadcrumbs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button 
                            className="mobile-menu-btn" 
                            style={{ display: 'none', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px' }}
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            <FiMenu />
                        </button>
                        <div className="header-breadcrumb">
                            <span className="breadcrumb-category">City operations</span>
                            <span className="breadcrumb-separator">/</span>
                            <span className="breadcrumb-page">{getPageTitle()}</span>
                        </div>
                    </div>

                    {/* Right: Search, Notifications & Avatar */}
                    <div className="header-right-actions">
                        {/* Search Bar with ⌘ K */}
                        <div className="header-search-box">
                            <FiSearch className="search-icon" />
                            <input 
                                type="text"
                                className="search-input"
                                placeholder="Search anything"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className="search-key-badge">⌘ K</span>
                        </div>

                        {/* Notification Bell */}
                        <div style={{ position: 'relative' }}>
                            <NotificationBell />
                        </div>

                        {/* User Avatar Circle */}
                        <div 
                            className="header-avatar-btn" 
                            onClick={handleLogout}
                            title={`Logged in as ${user?.name || 'User'} (${user?.role || 'Citizen'}). Click to Logout.`}
                        >
                            {initials}
                        </div>
                    </div>
                </header>

                {/* Page Outlet */}
                <div className="page-content">
                    <Outlet />
                </div>
            </main>

            <ChatBot />
            <RealTimeNotifications />
        </div>
    );
}
