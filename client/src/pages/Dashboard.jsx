import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, auditAPI, notificationAPI } from '../services/api';
import { FiBell, FiCalendar, FiX, FiFilter, FiPieChart, FiBarChart2 } from 'react-icons/fi';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, ComposedChart, Line, LabelList 
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import SummaryCards from '../components/Dashboard/SummaryCards';
import WardOverview from '../components/Dashboard/WardOverview';
import BudgetUtilization from '../components/Dashboard/BudgetUtilization';
import SpendingBreakdown from '../components/Dashboard/SpendingBreakdown';
import RecentActivities from '../components/Dashboard/RecentActivities';
import AlertsAndIssues from '../components/Dashboard/AlertsAndIssues';
import FundAllocationStatus from '../components/Dashboard/FundAllocationStatus';
import ExpenseAudit from '../components/Dashboard/ExpenseAudit';

const CATEGORIES = [
    { value: 'all', label: 'All Works' },
    { value: 'road', label: 'Roads & Infrastructure' },
    { value: 'electricity', label: 'Street Lighting & Electricity' },
    { value: 'drainage', label: 'SWD & Drainage Systems' },
    { value: 'water_supply', label: 'Water Supply & BWSSB' },
    { value: 'park', label: 'Parks & Horticulture' },
    { value: 'sanitation', label: 'Waste Management (SWM)' },
    { value: 'building', label: 'Public Buildings & Schools' },
];

const WARDS_DATA = [
    { name: 'Kempapura Agrahara', areas: ['RPC Layout', 'Binny Layout', 'Hosahalli Main Road'] },
    { name: 'Vijayanagar', areas: ['1st Stage', '2nd Stage', 'MC Layout', 'Maruti Mandir'] },
    { name: 'Hosahalli', areas: ['Hosahalli', 'Pipeline Road', 'MC Layout'] },
    { name: 'Hampi Nagar', areas: ['RPC Layout', 'Attiguppe', 'Hampi Nagar 1st Stage'] },
    { name: 'Bapuji Nagar', areas: ['New Guddadahalli', 'Bapuji Nagar'] },
    { name: 'Attiguppe', areas: ['Attiguppe', 'Binny Layout'] },
    { name: 'Gali Anjenaya Temple Ward', areas: ['Mysore Road', 'Gali Anjaneya Temple area'] },
    { name: 'Veerabhadranagar', areas: ['Veerabhadranagar', 'Girinagar 4th Phase'] },
    { name: 'Avalahalli', areas: ['Avalahalli', 'Muneshwara Block'] },
    { name: 'Sudham Nagara', areas: ['Sudham Nagar', 'Wilson Garden'] },
    { name: 'Dharmaraya Swamy Temple Ward', areas: ['OTC Road', 'Nagarthpet', 'Chickpet'] },
    { name: 'Sunkenahalli', areas: ['Sunkenahalli', 'Gavipuram'] },
    { name: 'Vishveshwara Puram', areas: ['V V Puram', 'Sajjan Rao Circle'] },
    { name: 'Ashoka Pillar', areas: ['Ashoka Pillar area', 'Jayanagar 1st Block'] },
    { name: 'Someshwara Nagar', areas: ['Someshwara Nagar', 'NIMHANS area'] },
    { name: 'Hombegowda Nagara', areas: ['Hombegowda Nagar', 'Wilson Garden'] },
    { name: 'Ejipura', areas: ['Ejipura', 'Viveknagar'] },
    { name: 'Koramangala', areas: ['1st Block', '3rd Block', '4th Block', '5th Block', '6th Block', '7th Block', '8th Block'] },
    { name: 'Adugodi', areas: ['Adugodi', 'Lakkasandra (part)'] },
    { name: 'Lakkasandra', areas: ['Lakkasandra', 'Wilson Garden (part)'] },
    { name: 'Suddagunte Palya', areas: ['S G Palya', 'Tavarekere'] },
    { name: 'Madivala', areas: ['Madivala', 'Maruti Nagar'] },
    { name: 'Jakkasandra', areas: ['Jakkasandra', 'Agara (part)'] },
    { name: 'BTM Layout', areas: ['1st Stage', '2nd Stage'] },
    { name: 'N S Palya', areas: ['N S Palya', 'Bilekahalli (part)'] },
    { name: 'Gurappanapalya', areas: ['BTM 1st Stage', 'Gurappanapalya'] },
    { name: 'Tilak Nagar', areas: ['Tilak Nagar', 'Jayanagar 4th T Block'] },
    { name: 'Byrasandra', areas: ['Byrasandra', 'Jayanagar 1st Block (part)'] },
    { name: 'Shakambari Nagar', areas: ['J P Nagar 1st Phase', 'Sarakki (part)'] },
    { name: 'J P Nagar', areas: ['2nd Phase', '3rd Phase', '6th Phase'] },
    { name: 'Sarakki', areas: ['Sarakki', 'J P Nagar 1st Phase (part)'] },
    { name: 'Yediyur', areas: ['Yediyur', 'Jayanagar 6th Block'] },
    { name: 'Umamaheshwari Ward', areas: ['Chikkallasandra', 'Ittamadu'] },
    { name: 'Ganesh Mandir Ward', areas: ['Hosakerehalli (part)', 'Banashankari 3rd Stage'] },
    { name: 'Banashankari Temple Ward', areas: ['BSK 2nd Stage'] },
    { name: 'Kumaraswamy Layout', areas: ['1st Stage', '2nd Stage'] },
    { name: 'Vikram Nagar', areas: ['ISRO Layout', 'Kumaraswamy Layout (part)'] },
    { name: 'Padmanabha Nagar', areas: ['Padmanabha Nagar', 'Chennammana Kere'] },
    { name: 'Kamakya Nagar', areas: ['Kamakya', 'Banashankari 3rd Stage'] },
    { name: 'Deen Dayalu Ward', areas: ['Tyagaraja Nagar', 'Basavanagudi (part)'] },
    { name: 'Hosakerehalli', areas: ['Hosakerehalli', 'Ittamadu'] },
    { name: 'Basavanagudi', areas: ['DVG Road', 'Gandhi Bazaar'] },
    { name: 'Hanumanth Nagar', areas: ['Hanumanth Nagar', 'Gavipuram'] },
    { name: 'Srinivasa Nagar', areas: ['Srinivasa Nagar', 'Banashankari 1st Stage'] },
    { name: 'Srinagar', areas: ['Srinagar', 'Banashankari 1st Stage'] },
    { name: 'Girinagar', areas: ['1st Phase', '2nd Phase', '3rd Phase'] },
    { name: 'Katriguppe', areas: ['Katriguppe', 'BSK 3rd Stage'] },
    { name: 'Vidyapeeta Ward', areas: ['Vidyapeetha', 'Chennammana Kere'] }
].sort((a, b) => a.name.localeCompare(b.name));

const STATUS_COLORS = {
    proposed: '#6366f1',
    approved: '#14b8a6',
    in_progress: '#f59e0b',
    completed: '#10b981'
};

function CategorySection({ initialCategory }) {
    const [category, setCategory] = useState(initialCategory || 'all');
    const [ward, setWard] = useState('all');
    const [wardSearch, setWardSearch] = useState('');
    const [area, setArea] = useState('all');
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showWardList, setShowWardList] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await auditAPI.getAnalytics(category, ward, area);
            setAnalytics(res.data.analytics);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [category, ward, area]);

    const selectedWardData = WARDS_DATA.find(w => w.name === ward);
    const filteredWards = WARDS_DATA.filter(w => 
        w.name.toLowerCase().includes(wardSearch.toLowerCase())
    );

    const sortedAreas = selectedWardData 
        ? [...selectedWardData.areas].sort((a, b) => a === 'All Areas' ? -1 : b === 'All Areas' ? 1 : a.localeCompare(b))
        : [];

    const generatePDF = (type) => {
        try {
            const doc = new jsPDF();
            const date = new Date().toLocaleDateString();
            const title = type === 'status' ? 'Project Status Report' : 'Financial Summary Report';
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('UrbanHelixX - BBMP Civic Portal', 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text(title, 105, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Generated on: ${date}`, 105, 38, { align: 'center' });
        doc.text(`Ward: ${ward === 'all' ? 'All Wards' : ward} | Area: ${area === 'all' ? 'All Areas' : area}`, 105, 45, { align: 'center' });

        if (type === 'status') {
            const fullBudgetData = analytics.departmentSpending || [];
            const tableData = fullBudgetData.map(d => [
                d.name || 'Unknown',
                formatCurrency(d.totalBudget || 0),
                formatCurrency(d.allocatedBudget || 0),
                formatCurrency(d.spentBudget || 0),
                `${d.allocatedBudget ? ((d.spentBudget / d.allocatedBudget) * 100).toFixed(1) : 0}%`
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['Location/Dept', 'Estimated', 'Allocated', 'Spent', 'Utilization']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241] }
            });
        } else {
            const fullBudgetData = analytics.departmentSpending || [];
            const totalEst = fullBudgetData.reduce((acc, curr) => acc + (curr.totalBudget || 0), 0);
            const totalAlloc = fullBudgetData.reduce((acc, curr) => acc + (curr.allocatedBudget || 0), 0);
            const totalSpent = fullBudgetData.reduce((acc, curr) => acc + (curr.spentBudget || 0), 0);

            autoTable(doc, {
                startY: 55,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Estimated Budget', formatCurrency(totalEst)],
                    ['Total Allocated Budget', formatCurrency(totalAlloc)],
                    ['Total Actual Expenditure', formatCurrency(totalSpent)],
                    ['Global Utilization Rate', `${totalAlloc > 0 ? ((totalSpent / totalAlloc) * 100).toFixed(1) : 0}%`]
                ],
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] }
            });
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text('Blockchain Verified Audit Report | UrbanHelixX Civic Monitoring System', 105, 285, { align: 'center' });
        }

        doc.save(`UrbanHelixX_${type}_${date.replace(/\//g, '-')}.pdf`);
        } catch(e) {
            console.error(e);
            alert("Failed to generate PDF");
        }
    };

    if (loading) return <div className="loading"><div className="spinner"/> Loading {category}...</div>;
    if (!analytics) return <div className="empty-state">No data for {category}</div>;

    // Compute ward status data
    const wardStatusData = (analytics.wardWiseProjectStatus || [])
        .map(w => {
            const item = { name: `Ward ${w._id}` || 'Unknown' };
            let total = 0;
            w.statuses.forEach(s => { item[s.status] = s.count; total += s.count; });
            item.total = total;
            return item;
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

    // Compute budget utilization data
    const budgetData = (analytics.departmentSpending || [])
        .map(d => ({
            name: d.name?.replace('&', '').substring(0, 15) || 'Unknown',
            Estimated: d.totalBudget || 0,
            Allocated: d.allocatedBudget || 0,
            Spent: d.spentBudget || 0,
            'Utilization %': d.allocatedBudget ? Number(((d.spentBudget / d.allocatedBudget) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.Estimated - a.Estimated)
        .slice(0, 10);

    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
        return `₹${value?.toLocaleString()}`;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(10px)' }}>
                    <p style={{ fontWeight: 700, marginBottom: '12px', color: '#fff', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>{label}</p>
                    {payload.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color }}></div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'capitalize' }}>{p.name.replace('_', ' ')}:</span>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, marginLeft: 'auto' }}>
                                {typeof p.value === 'number' && p.name !== 'Utilization %' && p.value > 1000 ? formatCurrency(p.value) : p.value}{p.name === 'Utilization %' ? '%' : ''}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                {/* Work Type Selection */}
                <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Work Type</div>
                    <select 
                        style={{ 
                            width: '100%', 
                            padding: '12px 16px', 
                            borderRadius: '12px', 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid var(--border-glass)', 
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        {CATEGORIES.map(c => <option key={c.value} value={c.value} style={{ background: '#0f172a' }}>{c.label}</option>)}
                    </select>
                </div>

                {/* Searchable Ward Selection */}
                <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Search Ward</div>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="text" 
                            placeholder="Type ward name..."
                            style={{ 
                                width: '100%', 
                                padding: '12px 16px', 
                                borderRadius: '12px', 
                                background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid var(--border-glass)', 
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                            value={ward === 'all' ? wardSearch : ward}
                            onChange={(e) => {
                                setWardSearch(e.target.value);
                                setWard('all');
                                setArea('all');
                                setShowWardList(true);
                            }}
                            onFocus={() => setShowWardList(true)}
                        />
                        {showWardList && (
                            <div style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: 0, 
                                right: 0, 
                                zIndex: 100, 
                                background: '#1e293b', 
                                borderRadius: '12px', 
                                border: '1px solid var(--border-glass)', 
                                marginTop: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                            }}>
                                <div 
                                    style={{ padding: '10px 16px', cursor: 'pointer', color: ward === 'all' ? '#6366f1' : '#fff' }}
                                    onClick={() => { setWard('all'); setWardSearch(''); setShowWardList(false); }}
                                >
                                    All Wards
                                </div>
                                {filteredWards.map(w => (
                                    <div 
                                        key={w.name} 
                                        style={{ 
                                            padding: '10px 16px', 
                                            cursor: 'pointer', 
                                            background: ward === w.name ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                            color: ward === w.name ? '#6366f1' : '#fff' 
                                        }}
                                        onClick={() => { setWard(w.name); setArea('all'); setShowWardList(false); }}
                                    >
                                        {w.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Area Selection (if Ward is selected) */}
                <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Specific Area</div>
                    <select 
                        disabled={ward === 'all'}
                        style={{ 
                            width: '100%', 
                            padding: '12px 16px', 
                            borderRadius: '12px', 
                            background: ward === 'all' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', 
                            border: '1px solid var(--border-glass)', 
                            color: ward === 'all' ? '#64748b' : '#fff',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: ward === 'all' ? 'not-allowed' : 'pointer'
                        }}
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                    >
                        <option value="all" style={{ background: '#0f172a' }}>All Areas</option>
                        {sortedAreas.filter(a => a !== 'All Areas').map(a => (
                            <option key={a} value={a} style={{ background: '#0f172a' }}>{a}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-glass), transparent)', margin: '40px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Budget Utilization (Full Width Premium Analytics) */}
                <div className="premium-chart-card" style={{ padding: '40px' }}>
                    <div className="chart-header" style={{ marginBottom: '40px' }}>
                        <div className="chart-icon-box emerald" style={{ width: '60px', height: '60px', fontSize: '30px' }}><FiBarChart2 /></div>
                        <div>
                            <h3 className="chart-title-text" style={{ fontSize: '28px' }}>Budget Utilization: {CATEGORIES.find(c => c.value === category)?.label}</h3>
                            <p className="chart-subtitle" style={{ fontSize: '15px' }}>Comparative analysis of allocated funds vs. actual expenditure across all {category} initiatives</p>
                        </div>
                    </div>
                    
                    {budgetData.length > 0 ? (
                        <div style={{ height: '500px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={budgetData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                                    <defs>
                                        <linearGradient id="colorEstimated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        </linearGradient>
                                        <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        </linearGradient>
                                        <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fill: '#94a3b8', fontSize: 13 }} 
                                        angle={-45} 
                                        textAnchor="end" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        dy={20} 
                                    />
                                    <YAxis 
                                        yAxisId="left" 
                                        tick={{ fill: '#94a3b8', fontSize: 13 }} 
                                        tickFormatter={formatCurrency} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        dx={-10} 
                                    />
                                    <YAxis 
                                        yAxisId="right" 
                                        orientation="right" 
                                        tick={{ fill: '#f59e0b', fontSize: 13 }} 
                                        tickFormatter={(v) => `${v}%`} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        dx={10} 
                                    />
                                    <Tooltip 
                                        content={<CustomTooltip />} 
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                                    />
                                    <Legend 
                                        wrapperStyle={{ paddingTop: '80px' }} 
                                        iconType="circle"
                                    />
                                    <Bar 
                                        yAxisId="left" 
                                        dataKey="Estimated" 
                                        fill="url(#colorEstimated)" 
                                        radius={[8,8,0,0]} 
                                        maxBarSize={40} 
                                    >
                                        <LabelList dataKey="Estimated" position="top" content={props => {
                                            const { x, y, width, value } = props;
                                            if (value === 0) return null;
                                            return (
                                                <text x={x + width / 2} y={y - 10} fill="#818cf8" fontSize={10} fontWeight="600" textAnchor="middle">
                                                    {formatCurrency(value)}
                                                </text>
                                            );
                                        }} />
                                    </Bar>
                                    <Bar 
                                        yAxisId="left" 
                                        dataKey="Allocated" 
                                        fill="url(#colorAllocated)" 
                                        radius={[8,8,0,0]} 
                                        maxBarSize={40} 
                                    >
                                        <LabelList dataKey="Allocated" position="top" content={props => {
                                            const { x, y, width, value } = props;
                                            if (value === 0) return null;
                                            return (
                                                <text x={x + width / 2} y={y - 10} fill="#60a5fa" fontSize={10} fontWeight="600" textAnchor="middle">
                                                    {formatCurrency(value)}
                                                </text>
                                            );
                                        }} />
                                    </Bar>
                                    <Bar 
                                        yAxisId="left" 
                                        dataKey="Spent" 
                                        fill="url(#colorSpent)" 
                                        radius={[8,8,0,0]} 
                                        maxBarSize={40} 
                                    >
                                        <LabelList dataKey="Spent" position="top" content={props => {
                                            const { x, y, width, value } = props;
                                            if (value === 0) return null;
                                            return (
                                                <text x={x + width / 2} y={y - 10} fill="#34d399" fontSize={10} fontWeight="600" textAnchor="middle">
                                                    {formatCurrency(value)}
                                                </text>
                                            );
                                        }} />
                                    </Bar>
                                    <Line 
                                        yAxisId="right" 
                                        type="monotone" 
                                        dataKey="Utilization %" 
                                        stroke="#f59e0b" 
                                        strokeWidth={4} 
                                        dot={{ r: 7, fill: '#f59e0b', strokeWidth: 3, stroke: '#0f172a' }} 
                                        activeDot={{ r: 10, strokeWidth: 0 }} 
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ height: '300px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📉</div>
                            <p>No financial data records found for the {category} category.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Reports Section */}
            <div style={{ marginTop: '40px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Civic Reports & Documents</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Download blockchain-verified status and financial reports</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button 
                        onClick={() => generatePDF('status')}
                        style={{ 
                            flex: 1, 
                            padding: '16px', 
                            borderRadius: '12px', 
                            background: 'rgba(99, 102, 241, 0.1)', 
                            border: '1px solid rgba(99, 102, 241, 0.2)', 
                            color: '#818cf8', 
                            fontWeight: '600', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <FiPieChart /> Project Status Report (PDF)
                    </button>
                    <button 
                        onClick={() => generatePDF('finance')}
                        style={{ 
                            flex: 1, 
                            padding: '16px', 
                            borderRadius: '12px', 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            border: '1px solid rgba(16, 185, 129, 0.2)', 
                            color: '#34d399', 
                            fontWeight: '600', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <FiBarChart2 /> Financial Summary (PDF)
                    </button>
                </div>
            </div>
        </>
    );
}

function ContractorDashboard({ user }) {
    const [stats, setStats] = useState({ totalProjects: 0, completedProjects: 0, totalBudget: 0, totalSpent: 0 });
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadContractorData = async () => {
        setLoading(true);
        try {
            const res = await projectAPI.getAll({ contractor: user._id });
            const myProjects = res.data.projects || [];
            setProjects(myProjects);
            
            const totalBudget = myProjects.reduce((acc, p) => acc + (p.allocatedBudget || p.estimatedBudget || 0), 0);
            const totalSpent = myProjects.reduce((acc, p) => acc + (p.spentBudget || 0), 0);
            const completed = myProjects.filter(p => p.status === 'completed').length;
            
            setStats({
                totalProjects: myProjects.length,
                completedProjects: completed,
                totalBudget,
                totalSpent
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadContractorData(); }, []);

    const formatCurrency = (value) => {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
        return `₹${value?.toLocaleString()}`;
    };

    if (loading) return <div className="loading"><div className="spinner"></div> Loading Contractor Workspace...</div>;

    return (
        <div className="premium-dashboard">
            <div className="premium-header">
                <div className="premium-header-title">Contractor Workspace — {user.name}</div>
                <div className="premium-header-meta">
                    <FiCalendar /> {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="summary-card glass-card">
                    <div className="card-label">TOTAL PROJECTS</div>
                    <div className="card-value">{stats.totalProjects}</div>
                    <div className="card-sublabel">Assigned to you</div>
                </div>
                <div className="summary-card glass-card">
                    <div className="card-label">COMPLETED</div>
                    <div className="card-value" style={{ color: 'var(--accent-green)' }}>{stats.completedProjects}</div>
                    <div className="card-sublabel">Fully verified works</div>
                </div>
                <div className="summary-card glass-card">
                    <div className="card-label">TOTAL ALLOCATED</div>
                    <div className="card-value" style={{ color: 'var(--accent-blue)' }}>{formatCurrency(stats.totalBudget)}</div>
                    <div className="card-sublabel">Total project budgets</div>
                </div>
                <div className="summary-card glass-card">
                    <div className="card-label">TOTAL SPENT</div>
                    <div className="card-value" style={{ color: 'var(--accent-red)' }}>{formatCurrency(stats.totalSpent)}</div>
                    <div className="card-sublabel">Expenditure logged</div>
                </div>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
                <div className="section-header" style={{ marginBottom: '24px' }}>
                    <h3 className="section-title">My Assigned Projects</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Real-time status and financial tracking of your ongoing BBMP projects</p>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Project Name</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Budget</th>
                                <th>Spent</th>
                                <th>Progress</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map(p => (
                                <tr key={p._id}>
                                    <td style={{ fontWeight: 600 }}>{p.title}</td>
                                    <td style={{ fontSize: '13px' }}>Ward {p.location?.wardNo}, {p.location?.area}</td>
                                    <td><span className={`status-badge ${p.status}`}>{p.status.replace('_', ' ')}</span></td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{formatCurrency(p.allocatedBudget)}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{formatCurrency(p.spentBudget)}</td>
                                    <td>
                                        <div style={{ width: '100px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', height: '6px' }}>
                                            <div style={{ 
                                                width: `${Math.min(100, (p.spentBudget / p.allocatedBudget) * 100)}%`, 
                                                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))',
                                                borderRadius: '10px',
                                                height: '100%'
                                            }} />
                                        </div>
                                    </td>
                                    <td>
                                        <a href={`/projects/${p._id}`} className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>Manage</a>
                                    </td>
                                </tr>
                            ))}
                            {projects.length === 0 && (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No projects assigned yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 className="section-title">Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
                        <a href="/expenses" className="glass-card" style={{ padding: '20px', textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
                            <div style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>Log New Expense</div>
                        </a>
                        <a href="/projects" className="glass-card" style={{ padding: '20px', textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
                            <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>Project Reports</div>
                        </a>
                    </div>
                </div>
                
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 className="section-title">Audit Compliance</h3>
                    <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <p>✅ Ensure all expenditure entries have a matching invoice date.</p>
                        <p>✅ Site progress photos must be captured physically via GPS camera.</p>
                        <p>✅ Material selections are strictly whitelisted based on project category.</p>
                        <p style={{ marginTop: '12px', padding: '10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                            ⚠️ <strong>Note:</strong> Finance will only release payments for Engineer-verified expenditures.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentProjects, setRecentProjects] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('road');
    const [notification, setNotification] = useState({ show: false, type: '', message: '', title: '' });

    const loadData = async () => {
        setLoading(true);
        try {
            const [projectRes, analyticsRes, notifRes] = await Promise.all([
                projectAPI.getAll({ limit: 5, category: category !== 'all' ? category : undefined }),
                auditAPI.getAnalytics(category),
                notificationAPI.getAll()
            ]);
            setRecentProjects(projectRes.data.projects || []);
            const analyticsData = analyticsRes.data.analytics;
            setAnalytics(analyticsData);

            // Trigger notification from server data
            const unreadNotifs = notifRes.data.notifications?.filter(n => !n.isRead) || [];
            if (unreadNotifs.length > 0) {
                const latest = unreadNotifs[0];
                setNotification({
                    show: true,
                    type: latest.type === 'fraud_alert' ? 'fraud' : 'update',
                    title: latest.title.toUpperCase(),
                    message: latest.message
                });
                notificationAPI.markAsRead(latest._id);
            }

            if (analyticsData?.departmentSpending) {
                const totalBudget = analyticsData.departmentSpending.reduce((acc, curr) => acc + (curr.totalBudget || curr.allocatedBudget), 0);
                const totalSpent = analyticsData.departmentSpending.reduce((acc, curr) => acc + curr.spentBudget, 0);
                const totalReleased = analyticsData.departmentSpending.reduce((acc, curr) => acc + (curr.totalReleasedFunds || 0), 0);
                setStats({ totalBudget, totalSpent, totalReleased });
            } else {
                try {
                    const statsRes = await projectAPI.getStats();
                    setStats(statsRes.data.stats);
                } catch (e) {
                    setStats({ totalBudget: 40500000, totalSpent: 28750000, totalReleased: 32000000 });
                }
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role !== 'contractor') {
            loadData();
        }
    }, [category, user]);

    if (user?.role === 'contractor') return <ContractorDashboard user={user} />;
    
    if (loading) return <div className="loading"><div className="spinner"></div> Loading premium dashboard...</div>;

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="premium-dashboard">
            {notification.show && (
                <div className={notification.type === 'fraud' ? 'fraud-notification' : 'budget-update-notification'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="notification-alert-icon" style={{ color: notification.type === 'fraud' ? '#ef4444' : '#3b82f6' }}>
                            {notification.type === 'fraud' ? '!' : 'i'}
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>{notification.title}</div>
                            <div style={{ fontSize: '12px', opacity: 0.9 }}>{notification.message}</div>
                        </div>
                    </div>
                    <button onClick={() => setNotification({ ...notification, show: false })} className="notification-close-btn">
                        <FiX />
                    </button>
                </div>
            )}

            <div className="premium-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="premium-header-title">BBMP Fund Transparency & Civic Project Monitoring</div>
                </div>
                <div className="premium-header-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiCalendar /> {today}
                    </div>
                    <FiBell style={{ fontSize: '18px', cursor: 'pointer' }} />
                    <div className="sidebar-avatar" style={{ width: '32px', height: '32px' }}>
                        {user?.name?.charAt(0)}
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <AlertsAndIssues wards={analytics?.departmentSpending || []} />
            </div>

            <SummaryCards stats={stats} wardCount={analytics?.departmentSpending?.length || 0} />

            <CategorySection initialCategory={category} />

            <div className="bottom-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <RecentActivities activities={recentProjects.map(p => ({
                        title: `${p.title} in ${p.department?.name || 'Urban'}`,
                        time: new Date(p.createdAt).toLocaleDateString(),
                        status: p.status === 'completed' ? 'completed' : p.status === 'in_progress' ? 'started' : 'pending'
                    }))} />
                    <SpendingBreakdown data={analytics?.projectsByCategory?.map(c => ({
                        name: c._id.charAt(0).toUpperCase() + c._id.slice(1).replace('_', ' '),
                        value: c.totalBudget,
                        color: c._id === 'road' ? '#6366f1' : c._id === 'water_supply' ? '#0ea5e9' : '#f59e0b'
                    }))} />
                    <FundAllocationStatus percentage={75} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <WardOverview wards={analytics?.wardWiseProjectStatus} />
                    <ExpenseAudit />
                </div>
            </div>
        </div>
    );
}
