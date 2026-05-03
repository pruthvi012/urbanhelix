import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiGrid, FiFolder, FiCheckSquare, FiDollarSign, FiAlertCircle, FiShield, FiBarChart2, FiLogOut, FiUsers, FiSearch, FiMenu, FiX, FiPlusCircle } from 'react-icons/fi';
import ChatBot from './ChatBot';
import NotificationBell from './NotificationBell';
import { requestForToken } from '../firebase';

const NAV_ITEMS = {
    citizen: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/grievances', icon: <FiAlertCircle />, label: 'Report a Problem' },
        { to: '/audit', icon: <FiShield />, label: 'Audit Trail' },

    ],
    engineer: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/milestones', icon: <FiCheckSquare />, label: 'Milestones' },
        { to: '/funds', icon: <FiDollarSign />, label: 'Fund Transactions' },
        { to: '/grievances', icon: <FiAlertCircle />, label: 'Citizen Complaints' },
        { to: '/audit', icon: <FiShield />, label: 'Audit Trail' },

    ],
    contractor: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'My Projects' },
    ],
    financial_officer: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/milestones', icon: <FiCheckSquare />, label: 'Milestones' },
        { to: '/funds', icon: <FiDollarSign />, label: 'Fund Verification' },
        { to: '/grievances', icon: <FiAlertCircle />, label: 'Citizen Complaints' },
        { to: '/audit', icon: <FiShield />, label: 'Audit Trail' },

    ],
    admin: [
        { to: '/', icon: <FiGrid />, label: 'Dashboard' },
        { to: '/projects', icon: <FiFolder />, label: 'Projects' },
        { to: '/milestones', icon: <FiCheckSquare />, label: 'Milestones' },
        { to: '/funds', icon: <FiDollarSign />, label: 'Fund Transactions' },
        { to: '/grievances', icon: <FiAlertCircle />, label: 'Citizen Complaints' },
        { to: '/audit', icon: <FiShield />, label: 'Audit Trail' },

    ],
};

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(
        window.Notification && (window.Notification.permission === 'default' || window.Notification.permission === 'denied')
    );

    const handleEnableNotifications = async () => {
        await requestForToken();
        setShowNotificationPrompt(false);
    };

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
                <header className="main-header">
                    <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(true)}>
                        <FiMenu size={24} />
                    </button>
                    <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/bbmp-logo.png" alt="BBMP Logo" style={{ height: '40px', objectFit: 'contain' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '0.5px', color: 'var(--text-primary)' }}>BBMP</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>South Zone Dashboard</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        <NotificationBell />
                        <div className="header-user" onClick={handleLogout} style={{ cursor: 'pointer' }} title="Click to Logout">
                            <div className="header-avatar">{initials}</div>
                        </div>
                    </div>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Menu Overlay */}
            {showMobileMenu && (
                <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}>
                    <div className="mobile-menu-content" onClick={e => e.stopPropagation()}>
                        <div className="mobile-menu-header">
                            <div className="sidebar-logo-text" style={{ fontSize: '18px' }}>UrbanHeliX</div>
                            <button className="btn-close" onClick={() => setShowMobileMenu(false)}>
                                <FiX size={24} />
                            </button>
                        </div>
                        <div className="mobile-menu-links">
                            {user?.role === 'engineer' && (
                                <NavLink to="/projects" onClick={() => setShowMobileMenu(false)} className="mobile-menu-item feature-link">
                                    <span className="icon"><FiPlusCircle size={20} /></span>
                                    <div>
                                        <div className="menu-item-title">Project Proposal</div>
                                        <div className="menu-item-desc">Add photos of damaged roads</div>
                                    </div>
                                </NavLink>
                            )}
                            <NavLink to="/grievances" onClick={() => setShowMobileMenu(false)} className="mobile-menu-item feature-link">
                                <span className="icon"><FiAlertCircle size={20} /></span>
                                <div>
                                    <div className="menu-item-title">Raise a Complaint</div>
                                    <div className="menu-item-desc">Report civic issues directly</div>
                                </div>
                            </NavLink>
                            <NavLink to="/milestones" onClick={() => setShowMobileMenu(false)} className="mobile-menu-item feature-link">
                                <span className="icon"><FiCheckSquare size={20} /></span>
                                <div>
                                    <div className="menu-item-title">See Milestones</div>
                                    <div className="menu-item-desc">Track project progress</div>
                                </div>
                            </NavLink>
                            
                            <hr style={{ margin: '16px 0', borderColor: 'var(--border-glass)' }} />
                            
                            {navItems.map((item) => (
                                <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setShowMobileMenu(false)} className={({ isActive }) => `mobile-menu-item basic ${isActive ? 'active' : ''}`}>
                                    <span className="icon">{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}

                            <hr style={{ margin: '16px 0', borderColor: 'var(--border-glass)' }} />
                            <button 
                                onClick={handleLogout} 
                                className="mobile-menu-item" 
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: '#ef4444', 
                                    width: '100%', 
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <span className="icon"><FiLogOut size={20} /></span>
                                <span>Logout / Switch Account</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ChatBot />

            {/* Global Notification Prompt */}
            {showNotificationPrompt && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="glass-card" style={{ maxWidth: '400px', width: '90%', margin: '0 auto', textAlign: 'center', padding: '30px 20px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--accent-blue)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 2s infinite' }}>🔔</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#fff' }}>Never Miss an Update!</h2>
                        
                        {window.Notification?.permission === 'denied' ? (
                            <>
                                <p style={{ color: 'var(--accent-red)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6, fontWeight: 'bold' }}>
                                    Notifications are currently BLOCKED in your phone's browser settings.
                                </p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                                    To receive updates, please tap the lock icon next to the URL in your browser, go to Site Settings, and change Notifications to "Allow".
                                </p>
                                <button className="btn btn-outline" style={{ width: '100%', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowNotificationPrompt(false)}>
                                    I understand, dismiss
                                </button>
                            </>
                        ) : (
                            <>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
                                    Get instant pop-up alerts on your phone when new projects are assigned or progress photos are uploaded in your city.
                                </p>
                                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                                    <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} onClick={handleEnableNotifications}>
                                        Yes, Notify Me Instantly!
                                    </button>
                                    <button className="btn btn-outline" style={{ width: '100%', border: 'none', color: 'var(--text-muted)' }} onClick={() => setShowNotificationPrompt(false)}>
                                        Maybe Later
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
