import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI } from '../services/api';
import { FiThumbsUp, FiThumbsDown, FiCamera, FiMapPin, FiCheckCircle } from 'react-icons/fi';

export default function Grievances() {
    const { user } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ project: '', title: '', description: '', category: 'other', ward: '', area: '' });
    const [file, setFile] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [gpsCameraRequested, setGpsCameraRequested] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await grievanceAPI.getAll({});
            setGrievances(res.data.grievances || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        
        // Auto-fetch location when photo is taken/selected
        if (selectedFile) {
            fetchLocation();
        }
    };

    const fetchLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            setGpsCameraRequested(true);
            return;
        }

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLocationLoading(false);
                setGpsCameraRequested(true);
            },
            (error) => {
                setLocationLoading(false);
                alert('Location access denied. Please enable GPS for verification.');
            },
            { enableHighAccuracy: true }
        );
    };

    const openGPSCameraApp = () => {
        // Trigger intent to open GPS Camera app natively, or fallback to PlayStore if not installed
        window.location.href = "intent://#Intent;package=com.vcamera.roudndai;scheme=android-app;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.vcamera.roudndai;end";
    };

    const handleVote = async (id, type) => {
        try {
            await grievanceAPI.vote(id, type);
            loadData();
        } catch (err) { console.error(err); }
    };

    const handleResolve = async (id) => {
        const remarks = prompt('Resolution remarks:');
        if (!remarks) return;
        try {
            await grievanceAPI.resolve(id, { status: 'resolved', remarks });
            loadData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            Object.keys(form).forEach(key => formData.append(key, form[key]));
            if (file) formData.append('image', file);
            if (location) formData.append('location', JSON.stringify(location));

            await grievanceAPI.create(formData);
            
            setShowModal(false);
            setForm({ project: '', title: '', description: '', category: 'other', ward: '', area: '' });
            setFile(null);
            setLocation(null);
            setGpsCameraRequested(false);
            loadData();
            alert('Problem reported successfully with GPS verification.');
        } catch (err) { 
            alert(err.response?.data?.message || 'Error submitting report'); 
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>;

    return (
        <div className="grievances-page">
            <div className="page-header">
                <h1 className="page-title">
                    {user?.role !== 'citizen' ? 'Citizen Complaints Management' : 'Citizen Problem Reporting'}
                </h1>
                <p className="page-subtitle">
                    {user?.role !== 'citizen' ? 'Review GPS-verified infrastructure issues reported by citizens' : 'Report infrastructure issues with GPS-verified evidence'}
                </p>
            </div>

            {user?.role === 'citizen' && (
                <button className="btn btn-primary" style={{ marginBottom: '20px', gap: '10px' }} onClick={() => setShowModal(true)}>
                    <FiCamera /> Report a Problem
                </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {grievances.map(g => (
                    <div key={g._id} className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                                    <span className={`badge badge-${g.category === 'corruption' || g.category === 'fund_misuse' ? 'rejected' : 'proposed'}`}>{g.category?.replace('_', ' ')}</span>
                                    <span className={`badge badge-${g.status}`}>{g.status?.replace('_', ' ')}</span>
                                    {g.location?.lat && (
                                        <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <FiCheckCircle size={10} /> GPS Verified
                                        </span>
                                    )}
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{g.title}</h3>
                                <div style={{ display: 'flex', gap: '15px', marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiMapPin size={14} /> Ward: {g.ward}</span>
                                    <span>Area: {g.area}</span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '15px' }}>{g.description}</p>
                                
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                    Filed by: <strong>{g.citizen?.name}</strong> • {new Date(g.createdAt).toLocaleString()}
                                    {g.location?.lat && ` • GPS: ${g.location.lat.toFixed(4)}, ${g.location.lng.toFixed(4)}`}
                                </div>

                                {g.imageUrl && (
                                    <div style={{ position: 'relative', marginTop: '10px', borderRadius: '12px', overflow: 'hidden' }}>
                                        <img src={`${g.imageUrl}`} alt="Problem evidence" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                                        {g.location?.lat && (
                                            <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: '4px', fontSize: '10px', color: 'white', backdropFilter: 'blur(4px)' }}>
                                                📍 {g.location.lat.toFixed(4)}, {g.location.lng.toFixed(4)}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {g.resolution?.remarks && (
                                    <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(16,185,129,0.08)', borderLeft: '4px solid var(--accent-green)', borderRadius: '4px', fontSize: '13px' }}>
                                        <strong style={{ color: 'var(--accent-green)' }}>Action Taken:</strong> {g.resolution.remarks}
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleVote(g._id, 'upvote')} style={{ minWidth: '70px', justifyContent: 'center' }}>
                                    <FiThumbsUp /> {g.upvoteCount || 0}
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleVote(g._id, 'downvote')} style={{ minWidth: '70px', justifyContent: 'center' }}>
                                    <FiThumbsDown /> {g.downvoteCount || 0}
                                </button>
                                {['engineer', 'admin'].includes(user?.role) && g.status !== 'resolved' && (
                                    <button className="btn btn-success btn-sm" onClick={() => handleResolve(g._id)} style={{ width: '100%', marginTop: '10px' }}>Resolve</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Report a Problem</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Evidence (Photo with GPS Timestamp)</label>
                                
                                {!gpsCameraRequested ? (
                                    <button type="button" className="btn btn-outline" onClick={fetchLocation} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed', height: '100px', flexDirection: 'column' }}>
                                        <FiMapPin size={24} />
                                        Verify Location First
                                    </button>
                                ) : (
                                    <div style={{ padding: '16px', background: 'var(--bg-glass)', border: '1px solid var(--accent-orange)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                                            <strong style={{ color: 'var(--accent-orange)' }}>⚠️ Location Verified.</strong><br/> 
                                            Tap below to open your GPS Camera App. Regular photos will be rejected during audit.
                                        </div>
                                        
                                        <button type="button" className="btn btn-primary" onClick={openGPSCameraApp} style={{ width: '100%', marginBottom: '16px', fontSize: '13px' }}>
                                            📸 Open GPS Camera App
                                        </button>
                                        
                                        <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>After taking photo, attach it here:</div>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="form-input" 
                                            onChange={(e) => setFile(e.target.files[0])}
                                            required 
                                        />
                                        {location && <div style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '8px' }}>📍 GPS Locked: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div>}
                                    </div>
                                )}
                                {locationLoading && <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '8px' }}>Fetching GPS coordinates...</div>}
                            </div>

                            <div className="grid-2" style={{ gap: '12px' }}>
                                <div className="form-group">
                                    <label className="form-label">Ward Number</label>
                                    <input className="form-input" placeholder="e.g. 157" value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Area Name</label>
                                    <input className="form-input" placeholder="e.g. Koramangala" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Short Title</label>
                                <input className="form-input" placeholder="e.g. Broken Pothole" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description of Problem</label>
                                <textarea className="form-textarea" rows={3} placeholder="Describe the issue in detail..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    <option value="road_damage">Road Damage / Pothole</option>
                                    <option value="water_issue">Water Supply Issue</option>
                                    <option value="garbage">Garbage / Sanitation</option>
                                    <option value="safety">Safety / Lighting</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={locationLoading}>Submit Report</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
