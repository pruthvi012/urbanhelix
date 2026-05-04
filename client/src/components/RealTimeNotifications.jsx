import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { FiBell, FiX, FiCheckCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const RealTimeNotifications = () => {
    const { user } = useAuth();
    const [notification, setNotification] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Use the current origin for the socket connection
        const socket = io(window.location.origin.replace('3000', '5000').replace('5173', '5000'), {
            transports: ['websocket']
        });

        socket.on('connect', () => {
            console.log('Connected to notification server');
            socket.emit('join_user', user._id);
        });

        socket.on('new_notification', (data) => {
            console.log('New real-time notification:', data);
            setNotification(data);
            setIsVisible(true);
            
            // Play a subtle notification sound
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                audio.play();
            } catch (e) { console.warn('Audio play failed', e); }

            // Auto-hide after 5 seconds
            setTimeout(() => {
                setIsVisible(false);
            }, 5000);
        });

        return () => socket.disconnect();
    }, [user]);

    if (!isVisible || !notification) return null;

    const getIcon = () => {
        switch (notification.type) {
            case 'fraud_alert': return <FiAlertTriangle style={{ color: '#ef4444' }} />;
            case 'public_update': return <FiCheckCircle style={{ color: '#10b981' }} />;
            default: return <FiInfo style={{ color: '#3b82f6' }} />;
        }
    };

    const getBorderColor = () => {
        switch (notification.type) {
            case 'fraud_alert': return '#ef4444';
            case 'public_update': return '#10b981';
            default: return '#3b82f6';
        }
    };

    return (
        <div 
            className="whatsapp-popup"
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                width: '320px',
                background: 'rgba(23, 23, 23, 0.95)',
                backdropFilter: 'blur(10px)',
                borderLeft: `4px solid ${getBorderColor()}`,
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                padding: '16px',
                zIndex: 10000,
                display: 'flex',
                gap: '12px',
                animation: 'slideIn 0.3s ease-out forwards',
                cursor: 'pointer'
            }}
            onClick={() => setIsVisible(false)}
        >
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .whatsapp-popup:hover {
                    background: rgba(30, 30, 30, 0.98);
                }
            `}</style>
            
            <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0
            }}>
                {getIcon()}
            </div>

            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{notification.title}</span>
                    <FiX style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setIsVisible(false); }} />
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                    {notification.message}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', textAlign: 'right' }}>
                    Just now • UrbanHeliX
                </div>
            </div>
        </div>
    );
};

export default RealTimeNotifications;
