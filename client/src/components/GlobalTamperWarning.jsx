import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiAlertTriangle, FiShieldOff, FiX } from 'react-icons/fi';
import { auditAPI } from '../services/api';

export default function GlobalTamperWarning() {
    const [isTampered, setIsTampered] = useState(false);
    const [tamperDetails, setTamperDetails] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const checkIntegrity = async () => {
            if (dismissed) return; // Don't keep checking if they dismissed it for this session
            
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
        const interval = setInterval(checkIntegrity, 5000);
        return () => clearInterval(interval);
    }, [dismissed]);

    if (!isTampered || dismissed) return null;

    // Do not show on audit page
    if (location.pathname === '/audit') return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                background: '#1e293b',
                border: '1px solid #ef4444',
                borderRadius: '16px',
                padding: '30px',
                maxWidth: '400px',
                width: '100%',
                position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <button 
                    onClick={() => setDismissed(true)}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                    }}
                >
                    <FiX />
                </button>

                <FiShieldOff style={{ fontSize: '48px', color: '#ef4444', marginBottom: '15px' }} />
                
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginBottom: '10px' }}>
                    Tampering Detected
                </h2>
                
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
                    The cryptographic hash chain validation failed. Discrepancies were found in {tamperDetails?.errors?.length || 1} financial record(s).
                </p>

                <button 
                    onClick={() => {
                        setDismissed(true);
                        navigate('/audit');
                    }}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '10px 0',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    View Audit Report
                </button>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
