import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { grievanceAPI, wardAPI } from '../services/api';
import { FiThumbsUp, FiThumbsDown, FiCamera, FiMapPin, FiCheckCircle } from 'react-icons/fi';
import { fallbackWards, mergeWithFallbackWards } from '../data/wardsFallback';

const convertDMSToDD = (dms, ref) => {
    if (!dms || dms.length < 3) return null;
    const toNumber = (value) => typeof value === 'object' && value?.denominator
        ? value.numerator / value.denominator
        : Number(value);
    let dd = toNumber(dms[0]) + toNumber(dms[1]) / 60 + toNumber(dms[2]) / 3600;
    if (ref === 'S' || ref === 'W') {
        dd = -dd;
    }
    return dd;
};

const normaliseGpsCoordinate = (value, ref) => {
    if (Number.isFinite(value)) return ref === 'S' || ref === 'W' ? -Math.abs(value) : Math.abs(value);
    return convertDMSToDD(value, ref);
};

export default function Grievances() {
    const { user } = useAuth();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showInvalidImageModal, setShowInvalidImageModal] = useState(false);
    const [invalidImageMsg, setInvalidImageMsg] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [wards, setWards] = useState([]);
    const [wardSearch, setWardSearch] = useState('');
    const [file, setFile] = useState(null);
    const [photoStatus, setPhotoStatus] = useState('');
    const [detectedPhotoGps, setDetectedPhotoGps] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [gpsCameraRequested, setGpsCameraRequested] = useState(false);
    const [form, setForm] = useState({ project: '', title: '', description: '', category: 'other', ward: '', wardNo: '', area: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [gRes, wRes] = await Promise.all([
                grievanceAPI.getAll({}),
                wardAPI.getAll()
            ]);
            setGrievances(gRes.data.grievances || []);
            setWards(mergeWithFallbackWards(wRes.data?.wards || []));
        } catch (err) {
            console.error(err);
            setWards(fallbackWards);
        } finally { setLoading(false); }
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
        window.location.href = "intent://#Intent;package=com.vcamera.roudndai;scheme=android-app;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.vcamera.roudndai;end";
    };

    const readPhotoGps = async (imageFile) => {
        const { default: EXIF } = await import('exif-js');
        const gps = await new Promise(resolve => {
            EXIF.getData(imageFile, function() {
                resolve({
                    lat: EXIF.getTag(this, 'GPSLatitude'),
                    lng: EXIF.getTag(this, 'GPSLongitude'),
                    latRef: EXIF.getTag(this, 'GPSLatitudeRef') || 'N',
                    lngRef: EXIF.getTag(this, 'GPSLongitudeRef') || 'E'
                });
            });
        });
        return {
            lat: normaliseGpsCoordinate(gps.lat, gps.latRef),
            lng: normaliseGpsCoordinate(gps.lng, gps.lngRef)
        };
    };

    const readPrintedPhotoGps = async (imageFile) => {
        const { recognize } = await import('tesseract.js');
        const result = await recognize(imageFile, 'eng');
        const text = result?.data?.text || '';
        const latitude = text.match(/(?:latitude|lat)\s*[:\-]?\s*([+-]?\d{1,2}(?:\.\d+)?)/i)?.[1]
            || text.match(/([+-]?\d{1,2}\.\d+)\s*(?:°|[NS])/i)?.[1];
        const longitude = text.match(/(?:longitude|long|lng)\s*[:\-]?\s*([+-]?\d{1,3}(?:\.\d+)?)/i)?.[1]
            || text.match(/([+-]?\d{1,3}\.\d+)\s*(?:°|[EW])/i)?.[1];
        return { lat: Number(latitude), lng: Number(longitude) };
    };

    const getDistanceMetres = (photoLocation, lockedLocation) => {
        if (!Number.isFinite(photoLocation?.lat) || !Number.isFinite(photoLocation?.lng) || !lockedLocation) return Infinity;
        const latitudeMetres = (photoLocation.lat - lockedLocation.lat) * 111_320;
        const longitudeMetres = (photoLocation.lng - lockedLocation.lng) * 111_320 * Math.cos(lockedLocation.lat * Math.PI / 180);
        return Math.hypot(latitudeMetres, longitudeMetres);
    };

    const isPhotoLocationMatch = (photoLocation, lockedLocation) => {
        return getDistanceMetres(photoLocation, lockedLocation) <= 500;
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0] || null;
        setFile(selectedFile);
        setShowInvalidImageModal(false);
        setPhotoStatus('');
        setDetectedPhotoGps(null);
        if (!selectedFile || !location) return;

        setPhotoStatus('Checking photo GPS location…');
        try {
            let photoLocation = await readPhotoGps(selectedFile);
            if (!Number.isFinite(photoLocation.lat) || !Number.isFinite(photoLocation.lng)) {
                setPhotoStatus('Reading the GPS location printed on this photo…');
                photoLocation = await readPrintedPhotoGps(selectedFile);
            }
            setDetectedPhotoGps(Number.isFinite(photoLocation.lat) && Number.isFinite(photoLocation.lng) ? photoLocation : null);
            if (isPhotoLocationMatch(photoLocation, location)) {
                setPhotoStatus(`✓ Photo matches the locked GPS location (${Math.round(getDistanceMetres(photoLocation, location))} m away). You can submit this report.`);
            } else {
                setPhotoStatus('⚠ Photo GPS does not match the locked location. Choose a different photo.');
            }
        } catch {
            setDetectedPhotoGps(null);
            setPhotoStatus('⚠ GPS location could not be read from this photo. Choose a GPS Camera photo with visible latitude and longitude.');
        }
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

    const handleDelete = async (grievance) => {
        if (!window.confirm(`Remove "${grievance.title}" and permanently delete its evidence photo?`)) return;
        try {
            await grievanceAPI.remove(grievance._id);
            setGrievances(current => current.filter(item => item._id !== grievance._id));
        } catch (err) {
            alert(err.response?.data?.message || 'Unable to remove this grievance');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        if (!form.ward || !form.area) {
            return alert('Please select a Ward and Area from the selection tool.');
        }

        if (!file) {
            return alert('Please attach a photo as evidence.');
        }

        if (!location) {
            setInvalidImageMsg('Location verification is required.\n\nPlease click "Verify Location First" and allow your browser to access the laptop location before submitting. A regular photo can be accepted only after a GPS location has been locked.');
            setShowInvalidImageModal(true);
            return;
        }

        const submitReport = async (successMessage) => {
            try {
                const formData = new FormData();
                Object.keys(form).forEach(key => formData.append(key, form[key]));
                formData.append('image', file);
                formData.append('location', JSON.stringify(location));

                await grievanceAPI.create(formData);
                setShowModal(false);
                setForm({ project: '', title: '', description: '', category: 'other', ward: '', wardNo: '', area: '' });
                setFile(null);
                setPhotoStatus('');
                setDetectedPhotoGps(null);
                setLocation(null);
                setGpsCameraRequested(false);
                loadData();
                setSuccessMessage(successMessage);
                setShowSuccessModal(true);
            } catch (err) {
                alert(err.response?.data?.message || 'Error submitting report');
            }
        };

        try {
            let photoLocation;
            try {
                photoLocation = await readPhotoGps(file);
            } catch {
                photoLocation = { lat: NaN, lng: NaN };
            }
            if (!Number.isFinite(photoLocation.lat) || !Number.isFinite(photoLocation.lng)) {
                photoLocation = detectedPhotoGps || { lat: NaN, lng: NaN };
                if (!Number.isFinite(photoLocation.lat) || !Number.isFinite(photoLocation.lng)) {
                    setInvalidImageMsg('Photo GPS could not be verified.\n\nChoose a GPS Camera photo with a clear latitude and longitude visible on the image.');
                    setShowInvalidImageModal(true);
                    return;
                }
            }

            if (!isPhotoLocationMatch(photoLocation, location)) {
                setInvalidImageMsg(`Invalid photo location.\n\nThe photo location (${photoLocation.lat.toFixed(4)}, ${photoLocation.lng.toFixed(4)}) does not match your GPS-locked location (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}). Please upload a valid photo taken at the selected location.`);
                setShowInvalidImageModal(true);
                return;
            }

            await submitReport('Problem reported successfully with matching GPS verification.');
        } catch (err) {
            setInvalidImageMsg('Photo GPS could not be verified.\n\nChoose a GPS Camera photo with a clear latitude and longitude visible on the image.');
            setShowInvalidImageModal(true);
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
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiMapPin size={14} /> Ward {g.wardNo}: {g.ward}</span>
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
                                {user?.role === 'admin' && (
                                    <button className="btn btn-sm" onClick={() => handleDelete(g)} style={{ width: '100%', marginTop: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>Remove</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-card" style={{
                        maxWidth: '600px',
                        width: 'calc(100vw - 24px)',
                        maxHeight: 'calc(100dvh - 32px)',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '22px'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Report a Problem</h3>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Evidence Photo</label>
                                
                                {!gpsCameraRequested ? (
                                    <button type="button" className="btn btn-outline" onClick={fetchLocation} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderStyle: 'dashed', height: '100px', flexDirection: 'column' }}>
                                        <FiMapPin size={24} />
                                        Verify Location First
                                    </button>
                                ) : (
                                    <div style={{ padding: '16px', background: 'var(--bg-glass)', border: '1px solid var(--accent-orange)', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                                            <strong style={{ color: 'var(--accent-orange)' }}>⚠️ Location Verified.</strong><br/>
                                            Upload a GPS-tagged photo. Its embedded GPS coordinates must match the browser's locked location before this report can be submitted.
                                        </div>
                                        
                                        <button type="button" className="btn btn-primary" onClick={openGPSCameraApp} style={{ width: '100%', marginBottom: '16px', fontSize: '13px' }}>
                                            📸 Open GPS Camera App
                                        </button>
                                        
                                        <div style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>Attach your photo here:</div>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="form-input" 
                                            onChange={handleFileChange}
                                            required 
                                        />
                                        {photoStatus && <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '10px', color: photoStatus.startsWith('✓') ? '#047857' : '#b45309' }}>{photoStatus}</div>}
                                        {location && <div style={{ fontSize: '11px', color: 'var(--accent-green)', marginTop: '8px' }}>📍 GPS Locked: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div>}
                                    </div>
                                )}
                                {locationLoading && <div style={{ fontSize: '11px', color: 'var(--accent-blue)', marginTop: '8px' }}>Fetching GPS coordinates...</div>}
                            </div>

                            <div className="ward-area-section" style={{ 
                                background: 'rgba(255,255,255,0.02)', 
                                padding: '15px', 
                                borderRadius: '12px', 
                                border: '1px solid var(--border-glass)',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ marginBottom: '8px' }}>1. Select official BBMP Ward</label>
                                        <div style={{ 
                                            maxHeight: '150px', 
                                            overflowY: 'auto', 
                                            background: 'rgba(0,0,0,0.2)', 
                                            borderRadius: '8px', 
                                            border: '1px solid var(--border-glass)',
                                            padding: '8px'
                                        }}>
                                            <input 
                                                className="form-input" 
                                                placeholder="🔍 Search ward name or number (e.g. BTM or 192)..."
                                                value={wardSearch} 
                                                onChange={(e) => setWardSearch(e.target.value)}
                                                style={{ marginBottom: '8px', height: '30px', fontSize: '12px' }}
                                            />
                                            {wards.filter(w => (w.name || '').toLowerCase().includes((wardSearch || '').toLowerCase()) || (w.assemblyConstituency || '').toLowerCase().includes((wardSearch || '').toLowerCase()) || (w.wardNo || '').toString().includes(wardSearch || '')).map(w => (
                                                <div 
                                                    key={w._id} 
                                                    onClick={() => setForm({ ...form, ward: w.name, wardNo: w.wardNo, area: '' })}
                                                    style={{ 
                                                        padding: '6px 10px', 
                                                        cursor: 'pointer', 
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        background: form.wardNo === w.wardNo ? '#1d4ed8' : 'rgba(255,255,255,0.14)',
                                                        color: '#ffffff',
                                                        fontWeight: form.wardNo === w.wardNo ? 800 : 700,
                                                        border: form.wardNo === w.wardNo ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
                                                        marginBottom: '4px'
                                                    }}
                                                >
                                                    <span>Ward {w.wardNo} — {w.name}</span>
                                                    <span style={{ color: '#bfdbfe', fontSize: '10px', fontWeight: 700 }}>{w.assemblyConstituency}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ marginBottom: '8px' }}>2. Select Area</label>
                                        {!form.ward ? (
                                            <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px dashed var(--border-glass)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                                                Select a ward to see areas
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                                                {(wards.find(w => w.wardNo === form.wardNo)?.areas || []).map(a => (
                                                    <div 
                                                        key={a} 
                                                        onClick={() => setForm({ ...form, area: a })}
                                                        style={{ 
                                                            padding: '6px', 
                                                            borderRadius: '6px', 
                                                            fontSize: '10px', 
                                                            cursor: 'pointer',
                                                            textAlign: 'center',
                                                            background: form.area === a ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                                                            color: form.area === a ? 'white' : 'var(--text-secondary)',
                                                            border: '1px solid var(--border-glass)'
                                                        }}
                                                    >
                                                        {a}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {form.area && (
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                                        📍 Selected ward: {form.wardNo} — {form.ward} · Selected area: {form.area}
                                    </div>
                                )}
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

                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', position: 'sticky', bottom: '-22px', zIndex: 1, background: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '16px 0' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={locationLoading}>Submit Report</button>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showInvalidImageModal && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowInvalidImageModal(false)}>
                    <div className="modal" style={{ 
                        maxWidth: '450px', 
                        border: '2px solid var(--accent-mint, #10b981)', 
                        background: '#0d231e', 
                        color: '#ffffff',
                        textAlign: 'center',
                        padding: '30px'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ 
                            width: '60px', 
                            height: '60px', 
                            borderRadius: '50%', 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            color: 'var(--accent-mint, #10b981)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            margin: '0 auto 20px auto',
                            fontSize: '24px'
                        }}>
                            ⚠️
                        </div>
                        <h3 style={{ 
                            fontSize: '20px', 
                            fontWeight: 700, 
                            color: 'var(--accent-mint, #10b981)', 
                            marginBottom: '12px' 
                        }}>
                            Invalid Image
                        </h3>
                        <p style={{ 
                            fontSize: '14px', 
                            lineHeight: 1.6, 
                            color: '#94a3b8', 
                            marginBottom: '24px',
                            whiteSpace: 'pre-line'
                        }}>
                            {invalidImageMsg}
                        </p>
                        <button 
                            type="button"
                            className="btn" 
                            style={{ 
                                background: 'var(--accent-mint, #10b981)', 
                                color: '#0d231e',
                                fontWeight: 700,
                                width: '100%',
                                padding: '12px',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }} 
                            onClick={() => setShowInvalidImageModal(false)}
                        >
                            Okay, Got It
                        </button>
                    </div>
                </div>
            )}

            {showSuccessModal && (
                <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowSuccessModal(false)}>
                    <div style={{
                        width: 'min(440px, calc(100vw - 40px))',
                        borderRadius: '22px',
                        padding: '34px 30px 30px',
                        background: 'linear-gradient(145deg, #063d3a 0%, #0b6d62 55%, #11a586 100%)',
                        border: '1px solid rgba(167, 243, 208, 0.6)',
                        boxShadow: '0 28px 70px rgba(2, 44, 34, 0.6)',
                        color: '#ffffff',
                        textAlign: 'center'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            margin: '0 auto 20px',
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.16)',
                            border: '2px solid rgba(255,255,255,0.7)',
                            fontSize: '38px',
                            fontWeight: 800,
                            boxShadow: '0 10px 28px rgba(0,0,0,0.18)'
                        }}>
                            ✓
                        </div>
                        <h3 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                            Report Submitted
                        </h3>
                        <p style={{ margin: '0 0 24px', color: '#d1fae5', fontSize: '15px', lineHeight: 1.6 }}>
                            {successMessage}
                        </p>
                        <button
                            type="button"
                            className="btn"
                            style={{
                                width: '100%',
                                padding: '13px',
                                border: 'none',
                                borderRadius: '10px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.16)'
                            }}
                            onClick={() => setShowSuccessModal(false)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
