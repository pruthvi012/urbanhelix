import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid } from 'react-icons/fi';

export default function Analytics() {
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: '60vh',
            textAlign: 'center',
            padding: '40px'
        }}>
            <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: 'rgba(99, 102, 241, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '40px',
                marginBottom: '24px'
            }}>📊</div>
            <h1 className="page-title">Analytics have Moved</h1>
            <p className="page-subtitle" style={{ maxWidth: '500px', margin: '0 auto 32px' }}>
                We've integrated all analytics directly into your main Dashboard for a more cohesive monitoring experience.
            </p>
            <NavLink to="/" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiGrid /> Go to Dashboard
            </NavLink>
        </div>
    );
}
