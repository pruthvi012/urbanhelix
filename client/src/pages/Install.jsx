import { useEffect, useState } from 'react';

export default function Install() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = /android/i.test(navigator.userAgent);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setInstalled(true));
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setInstalled(true);
            setDeferredPrompt(null);
        }
    };

    if (installed) {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                    <h1 style={styles.title}>App Installed!</h1>
                    <p style={styles.sub}>Open UrbanHelixX from your home screen</p>
                    <a href="/login" style={styles.btn}>Open App →</a>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Logo */}
                <div style={styles.logo}>
                    <span style={{ fontSize: 56 }}>🏛️</span>
                </div>
                <h1 style={styles.title}>UrbanHelixX</h1>
                <p style={styles.subtitle}>BBMP Civic Monitoring Portal</p>
                <p style={styles.sub}>Track roads, drainage, electricity & all BBMP projects in your area</p>

                <div style={styles.divider} />

                {/* Android — Chrome shows native prompt */}
                {deferredPrompt && (
                    <button onClick={handleInstall} style={styles.btn}>
                        📲 Install App on Your Phone
                    </button>
                )}

                {/* iOS Instructions */}
                {isIOS && (
                    <div style={styles.instructions}>
                        <p style={styles.instrTitle}>📱 Install on iPhone / iPad</p>
                        <div style={styles.step}><span style={styles.num}>1</span> Tap the <strong>Share</strong> button <span style={{ fontSize: 18 }}>⬆️</span> at the bottom of Safari</div>
                        <div style={styles.step}><span style={styles.num}>2</span> Scroll down and tap <strong>"Add to Home Screen"</strong></div>
                        <div style={styles.step}><span style={styles.num}>3</span> Tap <strong>"Add"</strong> — the app appears on your home screen!</div>
                    </div>
                )}

                {/* Android without prompt (Samsung Browser etc.) */}
                {isAndroid && !deferredPrompt && (
                    <div style={styles.instructions}>
                        <p style={styles.instrTitle}>📱 Install on Android</p>
                        <div style={styles.step}><span style={styles.num}>1</span> Tap the <strong>⋮ menu</strong> (3 dots) in Chrome</div>
                        <div style={styles.step}><span style={styles.num}>2</span> Tap <strong>"Add to Home screen"</strong></div>
                        <div style={styles.step}><span style={styles.num}>3</span> Tap <strong>"Add"</strong> to confirm</div>
                    </div>
                )}

                {/* Desktop */}
                {!isIOS && !isAndroid && (
                    <div style={styles.instructions}>
                        <p style={styles.instrTitle}>💻 Open on your phone</p>
                        <div style={styles.step}><span style={styles.num}>📶</span> Connect phone to the <strong>same WiFi</strong> as this laptop</div>
                        <div style={styles.step}><span style={styles.num}>🌐</span> Open Chrome and go to:<br/><strong style={{ fontSize: 13, wordBreak: 'break-all' }}>http://192.168.31.108:5174/install</strong></div>
                        <div style={styles.step}><span style={styles.num}>📲</span> Follow the install steps shown</div>
                    </div>
                )}

                <div style={styles.divider} />

                <a href="/login" style={{ ...styles.btn, background: 'rgba(255,255,255,0.08)', marginTop: 8 }}>
                    Skip & Login Instead →
                </a>

                <p style={{ color: '#475569', fontSize: 11, marginTop: 20, textAlign: 'center' }}>
                    Free • No account needed to view projects • BBMP South Zone
                </p>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
    },
    card: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px 28px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
    },
    logo: {
        width: 90, height: 90,
        background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
        borderRadius: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        border: '1px solid rgba(99,102,241,0.3)',
        boxShadow: '0 8px 24px rgba(99,102,241,0.2)'
    },
    title: {
        fontSize: 28, fontWeight: 800, color: '#fff',
        margin: '0 0 4px'
    },
    subtitle: {
        fontSize: 13, color: '#6366f1', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '1px',
        margin: '0 0 12px'
    },
    sub: {
        fontSize: 14, color: '#94a3b8', lineHeight: 1.6,
        margin: '0 0 8px'
    },
    divider: {
        height: 1,
        background: 'rgba(255,255,255,0.08)',
        margin: '24px 0'
    },
    btn: {
        display: 'block',
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: '#fff',
        border: 'none',
        borderRadius: '14px',
        padding: '16px 24px',
        fontSize: 16,
        fontWeight: 700,
        cursor: 'pointer',
        textDecoration: 'none',
        width: '100%',
        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
        transition: 'all 0.2s ease'
    },
    instructions: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '20px',
        textAlign: 'left',
        marginTop: 8
    },
    instrTitle: {
        color: '#fff', fontWeight: 700, fontSize: 15,
        marginBottom: 16, textAlign: 'center'
    },
    step: {
        display: 'flex', alignItems: 'flex-start', gap: 12,
        color: '#cbd5e1', fontSize: 14, lineHeight: 1.6,
        marginBottom: 12
    },
    num: {
        background: '#6366f1', color: '#fff',
        borderRadius: '50%', width: 26, height: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2
    }
};
