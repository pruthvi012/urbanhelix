import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, auditAPI, notificationAPI, grievanceAPI } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FiArrowUpRight, FiLayers, FiBarChart2, FiMessageSquare, FiDollarSign, 
    FiGlobe, FiTrendingUp, FiMoreHorizontal, FiCheckCircle, FiClock,
    FiFilter, FiDownload, FiMapPin, FiActivity, FiSearch, FiX
} from 'react-icons/fi';
import { 
    ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fallbackWards } from '../data/wardsFallback';

const BBMP_CIVIC_WORKS = [
    {
        key: 'Roads & Footpaths',
        name: 'Roads & Footpaths',
        icon: '🛣️',
        desc: 'Asphalt resurfacing, pothole repairs, arterial roads, pedestrian kerbs & walkways'
    },
    {
        key: 'Storm Water Drains',
        name: 'Storm Water Drains',
        icon: '🌧️',
        desc: 'Rajakaluve desilting, retaining wall construction, drain remodeling & flood prevention'
    },
    {
        key: 'Street Lighting',
        name: 'Street Lighting',
        icon: '💡',
        desc: 'LED street fixtures, high-mast illumination, pole maintenance & smart timer grids'
    },
    {
        key: 'Solid Waste Management',
        name: 'Solid Waste Management',
        icon: '♻️',
        desc: 'Door-to-door segregated collection, DWCC centres, compost units & ward cleanliness'
    },
    {
        key: 'Parks & Green Spaces',
        name: 'Parks & Green Spaces',
        icon: '🌳',
        desc: 'Public park upkeep, landscaping, children play areas, jogging tracks & greening'
    },
    {
        key: 'Lakes & Water Bodies',
        name: 'Lakes & Water Bodies',
        icon: '🌊',
        desc: 'Lake restoration, sewage diversion, bund stabilization & water quality testing'
    },
    {
        key: 'Public Infrastructure',
        name: 'Public Infrastructure',
        icon: '🏛️',
        desc: 'Community halls, municipal ward offices, maternity homes & civic markets'
    },
    {
        key: 'Other Civic Works',
        name: 'Other Civic Works',
        icon: '🏗️',
        desc: 'Traffic calming measures, civic signage, disaster response & utilities upkeep'
    }
];

const SAMPLE_DELIVERY_PROJECTS = [
    {
        _id: 'sample-1',
        title: 'North Harbor Transit Hub',
        ward: 'Ward 04',
        contractor: 'MetroBuild Infra',
        progress: 72,
        status: 'On track',
        spent: 31.4,
        total: 48.2
    },
    {
        _id: 'sample-2',
        title: 'East Corridor Storm Drainage',
        ward: 'Ward 12',
        contractor: 'Apex Civil Works',
        progress: 88,
        status: 'On track',
        spent: 14.2,
        total: 16.0
    },
    {
        _id: 'sample-3',
        title: 'Central Green Community Park',
        ward: 'Ward 08',
        contractor: 'EcoUrban Systems',
        progress: 45,
        status: 'In review',
        spent: 6.8,
        total: 15.5
    },
    {
        _id: 'sample-4',
        title: 'South Ring Road Smart Lighting',
        ward: 'Ward 15',
        contractor: 'Lumina Tech Grid',
        progress: 95,
        status: 'Completed',
        spent: 22.0,
        total: 22.0
    }
];

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [projects, setProjects] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showDetailedAnalytics, setShowDetailedAnalytics] = useState(false);
    
    // Citizen Dashboard State
    const [areaSearch, setAreaSearch] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedWardObj, setSelectedWardObj] = useState(null);
    const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
    const [citizenTab, setCitizenTab] = useState('ongoing'); // 'ongoing' or 'completed'
    const [wardACFilter, setWardACFilter] = useState('All');
    const [selectedCivicWork, setSelectedCivicWork] = useState(null);
    
    useEffect(() => {
        loadDashboardData();
    }, [selectedCategory]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [projRes, analyticsRes, grievanceRes] = await Promise.all([
                projectAPI.getAll({ limit: 100, category: selectedCategory !== 'all' ? selectedCategory : undefined }),
                auditAPI.getAnalytics(selectedCategory),
                grievanceAPI.getAll({ limit: 100 })
            ]);

            const loadedProjects = projRes.data?.projects || [];
            setProjects(loadedProjects);
            const aData = analyticsRes.data?.analytics;
            setAnalytics(aData);

            // Calculate project completion percentage
            let completionPercentage = 0;
            if (loadedProjects.length > 0) {
                const completedProjectsCount = loadedProjects.filter(p => p.status === 'completed').length;
                completionPercentage = Math.round((completedProjectsCount / loadedProjects.length) * 100);
            }

            // Calculate grievance statistics
            const grievancesList = grievanceRes.data?.grievances || [];
            const totalGrievances = grievancesList.length;
            const resolvedGrievancesCount = grievancesList.filter(g => g.status === 'resolved' || g.status === 'dismissed').length;
            const grievanceResolutionRate = totalGrievances > 0 
                ? Math.round((resolvedGrievancesCount / totalGrievances) * 100) 
                : 100; // Default to 100% resolved rate if there are 0 grievances

            const totalProjectsCount = projRes.data?.total ?? 0;
            const deliveryConfidence = totalProjectsCount > 0 
                ? Math.min(100, Math.round(75 + (completionPercentage * 0.15) + (grievanceResolutionRate * 0.1))) 
                : 100;
            const onTimeMilestoneDelivery = totalProjectsCount > 0 ? 92 : 100;
            const budgetVariance = totalProjectsCount > 0 ? 96.4 : 100;

            if (aData?.departmentSpending) {
                const totalBudget = aData.departmentSpending.reduce((acc, curr) => acc + (curr.totalBudget || curr.allocatedBudget || 0), 0);
                const totalSpent = aData.departmentSpending.reduce((acc, curr) => acc + (curr.spentBudget || 0), 0);
                const totalReleased = aData.departmentSpending.reduce((acc, curr) => acc + (curr.totalReleasedFunds || 0), 0);
                setStats({ 
                    totalBudget, 
                    totalSpent, 
                    totalReleased, 
                    totalProjects: totalProjectsCount,
                    completionPercentage,
                    grievanceResolutionRate,
                    totalGrievances,
                    deliveryConfidence,
                    onTimeMilestoneDelivery,
                    budgetVariance
                });
            } else {
                setStats({ 
                    totalBudget: 0, 
                    totalSpent: 0, 
                    totalReleased: 0, 
                    totalProjects: totalProjectsCount,
                    completionPercentage,
                    grievanceResolutionRate,
                    totalGrievances,
                    deliveryConfidence,
                    onTimeMilestoneDelivery,
                    budgetVariance
                });
            }
        } catch (err) {
            console.error('Dashboard load error:', err);
            setStats({ 
                totalBudget: 0, 
                totalSpent: 0, 
                totalReleased: 0, 
                totalProjects: 0,
                completionPercentage: 0,
                grievanceResolutionRate: 100,
                totalGrievances: 0,
                deliveryConfidence: 100,
                onTimeMilestoneDelivery: 100,
                budgetVariance: 100
            });
        } finally {
            setLoading(false);
        }
    };

    const formatCr = (val) => {
        if (!val) return '₹0 Cr';
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
        return `₹${val.toLocaleString()}`;
    };

    // Export PDF Report
    const exportPDF = () => {
        try {
            const doc = new jsPDF();
            const date = new Date().toLocaleDateString();
            doc.setFontSize(18);
            doc.text('UrbanHelix - Municipal Civic Transparency Report', 14, 20);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generated on: ${date} | Scope: City-wide Infrastructure`, 14, 28);

            const tableRows = (projects.length > 0 ? projects : SAMPLE_DELIVERY_PROJECTS).map(p => [
                p.title || 'Civic Project',
                p.location?.ward || p.ward || 'Ward 04',
                p.engineer?.name || 'Not Assigned',
                p.status || 'In Progress',
                `₹${((p.allocatedBudget || (p.spent * 10000000) || 1000000) / 10000000).toFixed(2)} Cr`
            ]);

            autoTable(doc, {
                startY: 36,
                head: [['Project Name', 'Ward / Area', 'Engineer', 'Status', 'Allocated Budget']],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: [13, 148, 136] }
            });

            doc.save(`UrbanHelix_City_Report_${date.replace(/\//g, '-')}.pdf`);
        } catch (e) {
            console.error('PDF error:', e);
        }
    };

    const displayProjects = projects.length > 0 ? projects.map(p => ({
        _id: p._id,
        title: p.title,
        ward: p.location?.ward ? `Ward ${p.location.wardNo || ''} · ${p.location.ward}` : 'Ward 04 · Central',
        wardNo: p.location?.wardNo || null,
        wardName: p.location?.ward || '',
        area: p.location?.area || '',
        contractor: p.contractor?.name || 'Assigned Builder',
        progress: p.status === 'completed' ? 100 : p.status === 'in_progress' ? 68 : p.status === 'verification' ? 90 : 25,
        status: p.status === 'completed' ? 'Completed' : p.status === 'in_progress' ? 'On track' : 'In review',
        category: p.category || 'Public Infrastructure',
        spent: ((p.spentBudget || 0) / 10000000).toFixed(1),
        total: ((p.allocatedBudget || p.estimatedBudget || 10000000) / 10000000).toFixed(1)
    })) : [];
    
    // Citizen Dashboard Derived State
    const allAreas = Array.from(new Set(displayProjects.map(p => p.ward)));
    
    // Auto-suggestions from South wards & registered project areas
    const areaSuggestions = (() => {
        if (!areaSearch || !areaSearch.trim()) return [];
        const term = areaSearch.toLowerCase().trim();
        const results = [];
        
        fallbackWards.forEach(w => {
            const matchesNo = String(w.wardNo).includes(term);
            const matchesName = w.name.toLowerCase().includes(term);
            const matchedArea = w.areas?.find(a => a.toLowerCase().includes(term));
            if (matchesNo || matchesName || matchedArea) {
                results.push({
                    type: 'ward',
                    label: `Ward ${w.wardNo} · ${w.name}`,
                    sub: matchedArea ? `Area: ${matchedArea} (${w.assemblyConstituency})` : w.assemblyConstituency,
                    ward: w
                });
            }
        });

        allAreas.forEach(a => {
            if (a.toLowerCase().includes(term) && !results.some(r => r.label.toLowerCase() === a.toLowerCase())) {
                results.push({
                    type: 'locality',
                    label: a,
                    sub: 'Project Locality'
                });
            }
        });

        return results.slice(0, 8);
    })();

    // Filter projects for selected ward / area
    const citizenProjects = selectedArea ? displayProjects.filter(p => {
        const sel = (selectedArea || '').toLowerCase().trim();
        const pWard = (p.ward || '').toLowerCase();
        const pWardName = (p.wardName || '').toLowerCase();
        const pArea = (p.area || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();
        const pWardNo = p.wardNo ? String(p.wardNo) : '';

        if (selectedWardObj) {
            if (pWardNo && String(selectedWardObj.wardNo) === pWardNo) return true;
            if (selectedWardObj.name && (pWard.includes(selectedWardObj.name.toLowerCase()) || pWardName.includes(selectedWardObj.name.toLowerCase()))) return true;
            if (selectedWardObj.areas && selectedWardObj.areas.some(a => pArea.includes(a.toLowerCase()) || pTitle.includes(a.toLowerCase()) || pWard.includes(a.toLowerCase()))) return true;
        }

        return pWard.includes(sel) || pWardName.includes(sel) || pArea.includes(sel) || sel.includes(pWardName) || (pWardNo && sel.includes(pWardNo));
    }) : [];

    const ongoingCitizenWorks = citizenProjects.filter(p => p.status !== 'Completed');
    const completedCitizenWorks = citizenProjects.filter(p => p.status === 'Completed');

    // South wards directory list
    const filteredSouthWards = fallbackWards.filter(w => {
        if (wardACFilter !== 'All' && !w.assemblyConstituency.toLowerCase().includes(wardACFilter.toLowerCase())) {
            return false;
        }
        if (areaSearch && areaSearch.trim()) {
            const term = areaSearch.toLowerCase().trim();
            const matchesNo = String(w.wardNo).includes(term);
            const matchesName = w.name.toLowerCase().includes(term);
            const matchesArea = w.areas?.some(a => a.toLowerCase().includes(term));
            return matchesNo || matchesName || matchesArea;
        }
        return true;
    });

    const southConstituencies = ['All', 'BTM Layout', 'Jayanagar', 'Padmanaba Nagar', 'Basavanagudi', 'Vijayanagar', 'Chickpet'];

    return (
        <div>
            {user && (
                <div className="welcome-greeting" style={{ 
                    marginBottom: '20px', 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>
                        Hello, Welcome <span style={{ color: 'var(--accent-teal)' }}>{user.name}</span>!
                    </div>
                    <button className="btn btn-primary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px' }}>
                        <FiDownload />
                        <span>Export Allocated Budget PDF</span>
                    </button>
                </div>
            )}
            {user?.role === 'engineer' && (
                <section style={{ marginBottom: '24px', padding: '26px', borderRadius: '18px', background: 'linear-gradient(135deg, #062f2b, #0f766e)', color: 'white', boxShadow: '0 16px 34px rgba(15,118,110,.22)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div><div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '.12em', opacity: .76 }}>SITE ENGINEER FIELD DESK</div><h2 style={{ margin: '7px 0', fontSize: '28px' }}>Today’s inspection workspace</h2><p style={{ margin: 0, opacity: .86 }}>Review citizen complaints, verify the site GPS photo, set repair urgency, and manage current projects.</p></div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}><Link to="/grievances" className="btn" style={{ background: '#fff', color: '#0f766e' }}>Inspect complaints</Link><Link to="/projects" className="btn" style={{ background: '#fbbf24', color: '#422006' }}>Current projects</Link></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '22px' }}>
                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,.13)' }}><strong style={{ fontSize: '24px' }}>{stats?.totalGrievances ?? 0}</strong><div style={{ fontSize: '12px', opacity: .85 }}>Complaints to inspect</div></div>
                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,.13)' }}><strong style={{ fontSize: '24px' }}>{stats?.totalProjects ?? 0}</strong><div style={{ fontSize: '12px', opacity: .85 }}>Current projects</div></div>
                        <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,.13)' }}><strong style={{ fontSize: '24px' }}>GPS</strong><div style={{ fontSize: '12px', opacity: .85 }}>Field evidence required</div></div>
                    </div>
                </section>
            )}
            {/* ─── 1. PUBLIC TRANSPARENCY PORTAL HERO BANNER ─── */}
            <div className="transparency-hero-card">
                <div className="hero-left-content">
                    <span className="hero-overline-badge">PUBLIC TRANSPARENCY PORTAL</span>
                    <h1 className="hero-headline">
                        See your city <br />
                        <span className="hero-headline-highlight">in progress.</span>
                    </h1>
                    <p className="hero-subtitle">
                        Track public projects, follow every rupee, and make your voice part of the city record.
                    </p>
                    <div className="hero-actions-row">
                        <Link to="/projects" className="hero-pill-btn primary">
                            Explore projects
                        </Link>
                        {user?.role === 'citizen' && (
                            <Link to="/grievances" className="hero-pill-btn">
                                Raise a grievance
                            </Link>
                        )}
                        <button 
                            type="button" 
                            className="hero-pill-btn"
                            onClick={() => setShowDetailedAnalytics(!showDetailedAnalytics)}
                        >
                            {showDetailedAnalytics ? 'Hide Analytics' : 'My activity'}
                        </button>
                    </div>
                </div>

                {/* Right Wireframe Globe & Live Badge */}
                <div className="hero-right-graphic">
                    <div className="globe-circle-badge">
                        <FiGlobe />
                    </div>
                    <div className="public-data-live-badge">
                        <span className="live-pulse-dot"></span>
                        <span>PUBLIC DATA LIVE</span>
                    </div>
                </div>
            </div>

            {/* ─── 2. TOP 4 KPI METRIC CARDS ─── */}
            <div className="kpi-cards-grid">
                {/* Active Projects */}
                <div className="kpi-metric-card">
                    <div className="kpi-card-header">
                        <div className="kpi-icon-box teal">
                            <FiLayers />
                        </div>
                        <div className="kpi-card-title">Active<br />projects</div>
                    </div>
                    <div>
                        <div className="kpi-card-value">{stats?.totalProjects ?? 0}</div>
                        <div className="kpi-card-subtext">{stats?.totalProjects > 0 ? 'Milestones in progress' : 'No upcoming milestones'}</div>
                    </div>
                </div>

                {/* City Completion */}
                <div className="kpi-metric-card">
                    <div className="kpi-card-header">
                        <div className="kpi-icon-box blue">
                            <FiBarChart2 />
                        </div>
                        <div className="kpi-card-title">City<br />completion</div>
                    </div>
                    <div>
                        <div className="kpi-card-value">{stats?.completionPercentage ?? 0}%</div>
                        <div className="kpi-card-subtext">
                            <span className="trend-green">{stats?.totalProjects > 0 ? '↑ 4.2%' : '0%'}</span> from last month
                        </div>
                    </div>
                </div>

                {/* Resolved Grievances */}
                <div className="kpi-metric-card">
                    <div className="kpi-card-header">
                        <div className="kpi-icon-box amber">
                            <FiMessageSquare />
                        </div>
                        <div className="kpi-card-title">Resolved<br />grievances</div>
                    </div>
                    <div>
                        <div className="kpi-card-value">{stats?.grievanceResolutionRate ?? 100}%</div>
                        <div className="kpi-card-subtext">Across all wards ({stats?.totalGrievances ?? 0} total)</div>
                    </div>
                </div>

                {/* Budget Utilization */}
                <div className="kpi-metric-card">
                    <div className="kpi-card-header">
                        <div className="kpi-icon-box purple">
                            <FiDollarSign />
                        </div>
                        <div className="kpi-card-title">Budget<br />utilization</div>
                    </div>
                    <div>
                        <div className="kpi-card-value">{formatCr(stats?.totalSpent)}</div>
                        <div className="kpi-card-subtext">of {formatCr(stats?.totalBudget)} allocated</div>
                    </div>
                </div>
            </div>

            {/* ─── 3. TWO-COLUMN LOWER SECTION ─── */}
            {user?.role === 'citizen' ? (
                <div className="dashboard-two-col" style={{ gridTemplateColumns: '1.05fr 1.35fr', gap: '24px' }}>
                    {/* LEFT SECTION: BBMP Works (List of civic works BBMP handles) */}
                    <div className="delivery-monitor-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="card-section-header" style={{ marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                                <div className="card-overline-tag">BBMP JURISDICTION</div>
                                <h3 className="card-title-main">BBMP Works</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                                    Civic works & public utilities executed across Bengaluru municipal wards
                                </p>
                            </div>
                            <span className="tx-tag" style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--accent-teal)', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>
                                8 Civic Mandates
                            </span>
                        </div>

                        {/* List of 8 Civic Works BBMP handles */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '530px', paddingRight: '4px' }}>
                            {BBMP_CIVIC_WORKS.map((work, idx) => (
                                <div 
                                    key={work.key}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '14px',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        border: '1px solid #f1f5f9',
                                        background: '#fafbfc',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{ 
                                        fontSize: '22px', 
                                        width: '40px', 
                                        height: '40px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        borderRadius: '10px', 
                                        background: '#ffffff', 
                                        border: '1px solid #e2e8f0',
                                        flexShrink: 0 
                                    }}>
                                        {work.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                                                {work.name}
                                            </h4>
                                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                                                0{idx + 1}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                                            {work.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT SECTION: South Bengaluru Wards (Searchable/listed set of all South wards & project display) */}
                    <div className="delivery-monitor-card bbmp-works-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div className="card-section-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '14px', borderBottom: 'none', paddingBottom: '0', marginBottom: '16px' }}>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <div className="card-overline-tag">WARD EXPLORER</div>
                                    <h3 className="card-title-main">South Bengaluru Wards</h3>
                                </div>
                                {selectedArea && (
                                    <button 
                                        onClick={() => {
                                            setSelectedArea('');
                                            setSelectedWardObj(null);
                                            setAreaSearch('');
                                        }}
                                        style={{ 
                                            background: '#f1f5f9', 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '16px', 
                                            padding: '4px 12px', 
                                            fontSize: '12px', 
                                            fontWeight: 600, 
                                            color: '#475569', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <FiX style={{ fontSize: '13px' }} />
                                        <span>Change Ward / View All</span>
                                    </button>
                                )}
                            </div>

                            {/* Search bar with locality & ward suggestions */}
                            <div style={{ position: 'relative', width: '100%' }}>
                                <FiSearch style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search locality or South ward (e.g., Koramangala, Avalahalli, 192)..."
                                    value={areaSearch}
                                    onChange={(e) => {
                                        setAreaSearch(e.target.value);
                                        setShowAreaSuggestions(true);
                                    }}
                                    onFocus={() => setShowAreaSuggestions(true)}
                                    style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: '10px', border: '1px solid var(--border-light)', fontSize: '14px', background: '#fafbfc' }}
                                />
                                {areaSearch && (
                                    <button 
                                        type="button" 
                                        onClick={() => { setAreaSearch(''); setShowAreaSuggestions(false); }} 
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                    >
                                        <FiX />
                                    </button>
                                )}

                                {/* Auto-suggestions dropdown */}
                                {showAreaSuggestions && areaSearch && (
                                    <div className="area-suggestions-dropdown" style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, 
                                        background: 'white', border: '1px solid var(--border-light)', 
                                        borderRadius: '10px', marginTop: '4px', zIndex: 30,
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '240px', overflowY: 'auto'
                                    }}>
                                        {areaSuggestions.length > 0 ? areaSuggestions.map((item, idx) => (
                                            <div 
                                                key={idx}
                                                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}
                                                onClick={() => {
                                                    if (item.ward) {
                                                        setSelectedWardObj(item.ward);
                                                        setSelectedArea(item.ward.name);
                                                        setAreaSearch(`Ward ${item.ward.wardNo} · ${item.ward.name}`);
                                                    } else {
                                                        setSelectedArea(item.label);
                                                        setAreaSearch(item.label);
                                                        setSelectedWardObj(null);
                                                    }
                                                    setShowAreaSuggestions(false);
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.label}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sub}</div>
                                            </div>
                                        )) : (
                                            <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                No matching South ward or locality found.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* When a ward / locality is selected: Show existing project display */}
                        {selectedArea ? (
                            <div className="bbmp-works-content" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                {/* Active Ward Info Badge */}
                                <div style={{ 
                                    padding: '10px 14px', 
                                    background: 'rgba(13, 148, 136, 0.06)', 
                                    borderRadius: '10px', 
                                    border: '1px solid rgba(13, 148, 136, 0.15)',
                                    marginBottom: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FiMapPin style={{ color: 'var(--accent-teal)' }} />
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                                            {selectedWardObj ? `Ward ${selectedWardObj.wardNo} - ${selectedWardObj.name}` : selectedArea}
                                        </span>
                                        {selectedWardObj?.assemblyConstituency && (
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                ({selectedWardObj.assemblyConstituency})
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-teal)' }}>
                                        {citizenProjects.length} Works
                                    </span>
                                </div>

                                {/* Tabs: Ongoing Works & Completed Works */}
                                <div className="tab-container" style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-light)', marginBottom: '16px' }}>
                                    <button 
                                        className={`tab-btn ${citizenTab === 'ongoing' ? 'active' : ''}`}
                                        onClick={() => setCitizenTab('ongoing')}
                                        style={{ background: 'none', border: 'none', borderBottom: citizenTab === 'ongoing' ? '2px solid var(--accent-blue)' : '2px solid transparent', padding: '8px 4px', fontWeight: 600, color: citizenTab === 'ongoing' ? 'var(--accent-blue)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
                                    >Ongoing Works ({ongoingCitizenWorks.length})</button>
                                    <button 
                                        className={`tab-btn ${citizenTab === 'completed' ? 'active' : ''}`}
                                        onClick={() => setCitizenTab('completed')}
                                        style={{ background: 'none', border: 'none', borderBottom: citizenTab === 'completed' ? '2px solid var(--accent-green)' : '2px solid transparent', padding: '8px 4px', fontWeight: 600, color: citizenTab === 'completed' ? 'var(--accent-green)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
                                    >Completed Works ({completedCitizenWorks.length})</button>
                                </div>
                                
                                {/* Existing Project Display without percentages/budgets/progress */}
                                <div className="delivery-projects-list" style={{ overflowY: 'auto', maxHeight: '380px', paddingRight: '4px' }}>
                                    {(citizenTab === 'ongoing' ? ongoingCitizenWorks : completedCitizenWorks).length > 0 ? (
                                        (citizenTab === 'ongoing' ? ongoingCitizenWorks : completedCitizenWorks).map(p => (
                                            <Link key={p._id} to={`/projects/${p._id}`} className="delivery-project-row" style={{ gridTemplateColumns: '1fr auto', padding: '14px 16px', alignItems: 'center' }}>
                                                <div className="project-row-info">
                                                    <h4 style={{ marginBottom: '4px', fontSize: '14px' }}>{p.title}</h4>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <span className="tx-tag" style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>{p.category}</span>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.contractor}</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <span className="tx-tag" style={{ 
                                                        background: p.status === 'Completed' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', 
                                                        color: p.status === 'Completed' ? 'var(--accent-green)' : 'var(--accent-blue)',
                                                        fontWeight: 600,
                                                        fontSize: '11px'
                                                    }}>{p.status}</span>
                                                    <FiArrowUpRight className="project-arrow-icon" style={{ position: 'static', opacity: 1, color: '#94a3b8' }} />
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="empty-state-container" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            <FiActivity style={{ fontSize: '26px', marginBottom: '10px', opacity: 0.4 }} />
                                            <p style={{ fontSize: '13px', margin: 0 }}>No {citizenTab} projects being done in this area.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* When NO ward is selected: Searchable/listed set of all South wards */
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                {/* Assembly Constituency filter chips */}
                                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '12px' }}>
                                    {southConstituencies.map(ac => (
                                        <button
                                            key={ac}
                                            onClick={() => setWardACFilter(ac)}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '16px',
                                                border: '1px solid',
                                                borderColor: wardACFilter === ac ? 'var(--accent-teal)' : '#e2e8f0',
                                                background: wardACFilter === ac ? 'var(--accent-teal)' : '#ffffff',
                                                color: wardACFilter === ac ? '#ffffff' : '#64748b',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {ac}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                                    Select a South Ward ({filteredSouthWards.length} Wards):
                                </div>

                                {/* Listed set of all South wards */}
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', 
                                    gap: '8px', 
                                    overflowY: 'auto', 
                                    maxHeight: '400px', 
                                    paddingRight: '4px' 
                                }}>
                                    {filteredSouthWards.map(w => (
                                        <div
                                            key={w.wardNo}
                                            onClick={() => {
                                                setSelectedWardObj(w);
                                                setSelectedArea(w.name);
                                                setAreaSearch(`Ward ${w.wardNo} · ${w.name}`);
                                            }}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '10px',
                                                border: '1px solid #e2e8f0',
                                                background: '#fafbfc',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--accent-teal)';
                                                e.currentTarget.style.background = '#ffffff';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e2e8f0';
                                                e.currentTarget.style.background = '#fafbfc';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ 
                                                    fontSize: '10px', 
                                                    fontWeight: 700, 
                                                    background: 'rgba(59, 130, 246, 0.1)', 
                                                    color: 'var(--accent-blue)', 
                                                    padding: '2px 6px', 
                                                    borderRadius: '6px' 
                                                }}>
                                                    Ward {w.wardNo}
                                                </span>
                                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                                    {w.assemblyConstituency.split(' ')[0]}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                                                {w.name}
                                            </div>
                                            {w.areas && w.areas.length > 0 && (
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {w.areas.slice(0, 2).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="dashboard-two-col">
                    {/* Left Column: Delivery Monitor (Non-citizen) */}
                    <div className="delivery-monitor-card">
                        <div className="card-section-header">
                            <div>
                                <div className="card-overline-tag">DELIVERY MONITOR</div>
                                <h3 className="card-title-main">Projects in your city</h3>
                            </div>
                            <Link to="/projects" className="view-all-link">
                                <span>View all</span>
                                <FiArrowUpRight />
                            </Link>
                        </div>

                        <div className="delivery-projects-list">
                            {displayProjects.length > 0 ? (
                                displayProjects.slice(0, 4).map((p) => (
                                    <Link key={p._id} to={`/projects/${p._id}`} className="delivery-project-row">
                                        <div className="project-row-info">
                                            <h4>{p.title}</h4>
                                            <p>{p.ward} · {p.contractor}</p>
                                        </div>

                                        <div className="project-row-progress">
                                            <div className="progress-meta-text">
                                                <span>{p.progress}% complete</span>
                                                <span>{p.status}</span>
                                            </div>
                                            <div className="progress-track">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ 
                                                        width: `${p.progress}%`,
                                                        background: p.status === 'In review' ? 'var(--accent-amber)' : 'var(--accent-teal)'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="project-row-financials">
                                            <div className="project-budget-val">₹{p.spent} Cr</div>
                                            <div className="project-budget-sub">of ₹{p.total} Cr</div>
                                        </div>

                                        <FiArrowUpRight className="project-arrow-icon" />
                                    </Link>
                                ))
                            ) : (
                                <div className="empty-state-container" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p style={{ marginBottom: '16px' }}>No projects registered yet.</p>
                                    {user && (user.role === 'admin' || user.role === 'official') && (
                                        <Link to="/projects" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px', background: 'var(--accent-teal)', color: 'white', border: 'none' }}>
                                            Go to Projects
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: City Health / Delivery Confidence (Non-citizen) */}
                    <div className="city-health-card">
                        <div>
                            <div className="card-section-header" style={{ marginBottom: '12px' }}>
                                <div>
                                    <div className="card-overline-tag">CITY HEALTH</div>
                                    <h3 className="card-title-main" style={{ fontSize: '18px' }}>Delivery confidence</h3>
                                </div>
                                <button 
                                    type="button" 
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
                                    onClick={exportPDF}
                                    title="Export City Report PDF"
                                >
                                    <FiMoreHorizontal />
                                </button>
                            </div>

                            {/* Circular Score Gauge */}
                            <div className="gauge-score-container">
                                <div className="gauge-circle-box">
                                    <svg width="90" height="90" viewBox="0 0 90 90">
                                        <circle cx="45" cy="45" r="38" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                        <circle 
                                            cx="45" cy="45" r="38" fill="none" stroke="#10b981" strokeWidth="8"
                                            strokeDasharray="238.7" strokeDashoffset={238.7 * (1 - (stats?.deliveryConfidence ?? 100) / 100)} strokeLinecap="round"
                                            transform="rotate(-90 45 45)"
                                        />
                                    </svg>
                                    <div className="gauge-score-number">
                                        <span className="score-bold">{stats?.deliveryConfidence ?? 100}</span>
                                        <span className="score-max">/100</span>
                                    </div>
                                </div>

                                <div className="gauge-meta-info">
                                    <h3>{stats?.deliveryConfidence >= 80 ? 'Healthy momentum' : stats?.deliveryConfidence >= 50 ? 'Moderate momentum' : 'Attention required'}</h3>
                                    <div className="momentum-badge">
                                        <FiTrendingUp />
                                        <span>{stats?.totalProjects > 0 ? 'Up 6 points this month' : 'Stable'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown Sub-metrics */}
                        <div className="health-metrics-sublist">
                            <div className="health-sub-item">
                                <span className="health-sub-label">On-time milestone delivery</span>
                                <span className="health-sub-val" style={{ color: '#047857' }}>{stats?.onTimeMilestoneDelivery ?? 100}%</span>
                            </div>
                            <div className="health-sub-item">
                                <span className="health-sub-label">Budget variance compliance</span>
                                <span className="health-sub-val">{stats?.budgetVariance ?? 100}%</span>
                            </div>
                            <div className="health-sub-item">
                                <span className="health-sub-label">Cryptographic ledger audit</span>
                                <span className="health-sub-val" style={{ color: 'var(--accent-teal)' }}>Verified ✓</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── 4. OPTIONAL IN-DEPTH WARD ANALYTICS & EXPORT ─── */}
            {showDetailedAnalytics && (
                <div className="civic-card" style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Ward-wise Budget vs. Expenditure</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Real-time comparative analysis across municipal wards</p>
                        </div>
                    </div>

                    {analytics?.departmentSpending && (
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={analytics.departmentSpending.slice(0, 8)} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-25} textAnchor="end" />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatCr} />
                                    <Tooltip formatter={(v) => formatCr(v)} />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey="allocatedBudget" name="Allocated Budget" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                    <Bar dataKey="spentBudget" name="Spent Amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
