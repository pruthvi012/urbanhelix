import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiShieldOff } from 'react-icons/fi';
import { auditAPI } from '../services/api';

export default function GlobalTamperWarning() {
    const [isTampered, setIsTampered] = useState(false);
    const [tamperDetails, setTamperDetails] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkIntegrity = async () => {
            try {
                const res = await auditAPI.verifyChain();
                if (res.data && res.data.valid === false) {
                    setIsTampered(true);
                    setTamperDetails(res.data);
                } else {
                    setIsTampered(false);
                }
            } catch (err) {
                console.error("Integrity check failed", err);
            }
        };

        checkIntegrity();
        // Check every 5 seconds for the demo!
        const interval = setInterval(checkIntegrity, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!isTampered) return null;

    // Do not block the actual audit page so they can see the details
    if (location.pathname === '/audit') return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            padding: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
        }}>
            <FiShieldOff style={{ fontSize: '100px', marginBottom: '20px', animation: 'pulse 2s infinite' }} />
            <h1 style={{ fontSize: '48px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                🚨 SYSTEM LOCKDOWN 🚨
            </h1>
            <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '30px' }}>
                CRITICAL DATA CORRUPTION DETECTED
            </h2>
            <div style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '30px', 
                borderRadius: '16px',
                border: '2px solid rgba(255,255,255,0.2)',
                maxWidth: '600px'
            }}>
                <p style={{ fontSize: '20px', lineHeight: '1.6', marginBottom: '20px' }}>
                    The cryptographic hash chain has been broken. An unauthorized modification to financial records was detected.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '24px', fontWeight: 'bold', color: '#fca5a5' }}>
                    <FiAlertTriangle />
                    <span>{tamperDetails?.errors?.length || 1} Block(s) Compromised</span>
                </div>
            </div>
            
            <button 
                onClick={() => navigate('/audit')}
                style={{
                    marginTop: '40px',
                    padding: '16px 40px',
                    fontSize: '22px',
                    fontWeight: 800,
                    backgroundColor: 'white',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s ease',
                    textTransform: 'uppercase'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
                View Audit Report
            </button>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
