const fs = require('fs');
let content = fs.readFileSync('client/src/pages/Login.jsx', 'utf8');

const target = `                        ) : loginMethod === 'otp' ? (
                            <>
                                {otpSent && demoOtp && (
                                    <div className="login-otp-demo-banner">
                                        ?? <strong>Demo Mode Verification Code</strong><br />
                                        A simulated OTP <strong>{demoOtp}</strong> has been generated for phone <strong>{phone}</strong>.
                                    </div>
                                )}`;

const replacement = `                        ) : loginMethod === 'otp' ? (
                            <>
                                {otpSent && demoOtp && (
                                    <div className="simulated-sms-toast" style={{
                                        background: '#fff',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        marginBottom: '20px',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                        border: '1px solid #e2e8f0',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        animation: 'slideDown 0.4s ease-out'
                                    }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#0d9488' }}></div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <div style={{ background: '#f0fdfa', color: '#0d9488', padding: '6px', borderRadius: '50%' }}>
                                                ??
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>NEW MESSAGE • NOW</div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>BBMP-CIVIC</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#334155', paddingLeft: '40px', lineHeight: '1.4' }}>
                                            Your UrbanHeliX verification code is: <strong style={{ fontSize: '16px', color: '#0d9488', letterSpacing: '1px' }}>{demoOtp}</strong>. Valid for 5 minutes.
                                        </div>
                                        <style>{\`@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }\`}</style>
                                    </div>
                                )}`;

content = content.replace(target, replacement);
// Fallback for different line endings:
if(content.indexOf('simulated-sms-toast') === -1) {
    const targetCRLF = target.replace(/\n/g, '\r\n');
    content = content.replace(targetCRLF, replacement.replace(/\n/g, '\r\n'));
}

fs.writeFileSync('client/src/pages/Login.jsx', content, 'utf8');
console.log('Patched Login.jsx');
