import { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiInfo, FiAlertCircle, FiClock } from 'react-icons/fi';
import { notificationAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await notificationAPI.getAll();
            if (res.data.success) {
                setNotifications(res.data.notifications);
                setUnreadCount(res.data.notifications.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Polling for new notifications every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id, e) => {
        e.stopPropagation();
        try {
            await notificationAPI.markAsRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification._id, { stopPropagation: () => {} });
        }
        setIsOpen(false);

        // Navigation logic based on notification type
        if (notification.relatedEntity?.entityType === 'Project') {
            navigate(`/projects/${notification.relatedEntity.entityId}`);
        } else if (notification.relatedEntity?.entityType === 'Grievance') {
            navigate('/grievances');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'project_approved': return <FiCheck className="text-green-500" />;
            case 'budget_change': return <FiAlertCircle className="text-yellow-500" />;
            case 'system': return <FiInfo className="text-blue-500" />;
            default: return <FiBell />;
        }
    };

    return (
        <div className="notification-wrapper" ref={dropdownRef}>
            <button 
                className={`notification-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <FiBell />
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown glass-effect">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="unread-label">{unreadCount} unread</span>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading && notifications.length === 0 ? (
                            <div className="notification-loading">
                                <div className="spinner"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <FiBell className="empty-icon" />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification._id} 
                                    className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon-wrapper">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">{notification.title}</div>
                                        <div className="notification-message">{notification.message}</div>
                                        <div className="notification-time">
                                            <FiClock /> {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                    {!notification.isRead && (
                                        <button 
                                            className="mark-read-btn"
                                            onClick={(e) => handleMarkAsRead(notification._id, e)}
                                            title="Mark as read"
                                        >
                                            <div className="dot"></div>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="notification-footer">
                        <button onClick={() => navigate('/notifications')}>View all notifications</button>
                    </div>
                </div>
            )}
        </div>
    );
}
