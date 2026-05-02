import React from 'react';

export default function WardOverview({ wards }) {
    const defaultWards = [
        // Vijayanagar AC (167)
        { wardNo: 156, name: 'Kempapura Agrahara', id: 'Vijayanagar AC', budget: '15M', released: '12M', spent: '8M', areas: ['RPC Layout', 'Binny Layout', 'Hosahalli Main Road'] },
        { wardNo: 157, name: 'Vijayanagar', id: 'Vijayanagar AC', budget: '18M', released: '15M', spent: '14M', areas: ['1st Stage', '2nd Stage', 'MC Layout', 'Maruti Mandir'] },
        { wardNo: 158, name: 'Hosahalli', id: 'Vijayanagar AC', budget: '12M', released: '10M', spent: '9M', areas: ['Hosahalli', 'Pipeline Road', 'MC Layout'] },
        { wardNo: 159, name: 'Hampi Nagar', id: 'Vijayanagar AC', budget: '8M', released: '6M', spent: '5M', areas: ['RPC Layout', 'Attiguppe', 'Hampi Nagar 1st Stage'] },
        { wardNo: 160, name: 'Bapuji Nagar', id: 'Vijayanagar AC', budget: '20M', released: '18M', spent: '17.5M', areas: ['New Guddadahalli', 'Bapuji Nagar'] },
        { wardNo: 161, name: 'Attiguppe', id: 'Vijayanagar AC', budget: '10M', released: '8M', spent: '7M', areas: ['Attiguppe', 'Binny Layout'] },
        { wardNo: 162, name: 'Gali Anjenaya Temple Ward', id: 'Vijayanagar AC', budget: '25M', released: '20M', spent: '18M', areas: ['Mysore Road', 'Gali Anjaneya Temple area'] },
        { wardNo: 163, name: 'Veerabhadranagar', id: 'Vijayanagar AC', budget: '14M', released: '11M', spent: '10M', areas: ['Veerabhadranagar', 'Girinagar 4th Phase'] },
        { wardNo: 164, name: 'Avalahalli', id: 'Vijayanagar AC', budget: '11M', released: '9M', spent: '8.5M', areas: ['Avalahalli', 'Muneshwara Block'] },

        // Chickpet AC (169)
        { wardNo: 171, name: 'Sudham Nagara', id: 'Chickpet AC', budget: '10M', released: '8M', spent: '7.8M', areas: ['Sudham Nagar', 'Wilson Garden'] },
        { wardNo: 172, name: 'Dharmaraya Swamy Temple Ward', id: 'Chickpet AC', budget: '28M', released: '22M', spent: '21M', areas: ['OTC Road', 'Nagarthpet', 'Chickpet'] },
        { wardNo: 173, name: 'Sunkenahalli', id: 'Chickpet AC', budget: '7M', released: '5M', spent: '4.5M', areas: ['Sunkenahalli', 'Gavipuram'] },
        { wardNo: 174, name: 'Vishveshwara Puram', id: 'Chickpet AC', budget: '16M', released: '13M', spent: '12M', areas: ['V V Puram', 'Sajjan Rao Circle'] },
        { wardNo: 175, name: 'Ashoka Pillar', id: 'Chickpet AC', budget: '20M', released: '17M', spent: '16M', areas: ['Ashoka Pillar area', 'Jayanagar 1st Block'] },
        { wardNo: 176, name: 'Someshwara Nagar', id: 'Chickpet AC', budget: '13M', released: '11M', spent: '10.5M', areas: ['Someshwara Nagar', 'NIMHANS area'] },
        { wardNo: 177, name: 'Hombegowda Nagara', id: 'Chickpet AC', budget: '18M', released: '15M', spent: '14M', areas: ['Hombegowda Nagar', 'Wilson Garden'] },

        // BTM Layout AC (172)
        { wardNo: 185, name: 'Ejipura', id: 'BTM Layout AC', budget: '14M', released: '12M', spent: '11M', areas: ['Ejipura', 'Viveknagar'] },
        { wardNo: 186, name: 'Koramangala', id: 'BTM Layout AC', budget: '25M', released: '22M', spent: '20M', areas: ['1st Block', '3rd Block', '4th Block', '5th Block', '6th Block', '7th Block', '8th Block'] },
        { wardNo: 187, name: 'Adugodi', id: 'BTM Layout AC', budget: '19M', released: '16M', spent: '15M', areas: ['Adugodi', 'Lakkasandra (part)'] },
        { wardNo: 188, name: 'Lakkasandra', id: 'BTM Layout AC', budget: '15M', released: '13M', spent: '12.5M', areas: ['Lakkasandra', 'Wilson Garden (part)'] },
        { wardNo: 189, name: 'Suddagunte Palya', id: 'BTM Layout AC', budget: '12M', released: '10M', spent: '9M', areas: ['S G Palya', 'Tavarekere'] },
        { wardNo: 190, name: 'Madivala', id: 'BTM Layout AC', budget: '21M', released: '19M', spent: '18.5M', areas: ['Madivala', 'Maruti Nagar'] },
        { wardNo: 191, name: 'Jakkasandra', id: 'BTM Layout AC', budget: '9M', released: '7M', spent: '6.5M', areas: ['Jakkasandra', 'Agara (part)'] },
        { wardNo: 192, name: 'BTM Layout', id: 'BTM Layout AC', budget: '35M', released: '30M', spent: '28M', areas: ['1st Stage', '2nd Stage'] },
        { wardNo: 193, name: 'N S Palya', id: 'BTM Layout AC', budget: '14M', released: '12M', spent: '11M', areas: ['N S Palya', 'Bilekahalli (part)'] },

        // Jayanagar AC (173)
        { wardNo: 194, name: 'Gurappanapalya', id: 'Jayanagar AC', budget: '16M', released: '14M', spent: '13.5M', areas: ['BTM 1st Stage', 'Gurappanapalya'] },
        { wardNo: 195, name: 'Tilak Nagar', id: 'Jayanagar AC', budget: '17M', released: '15M', spent: '14.5M', areas: ['Tilak Nagar', 'Jayanagar 4th T Block'] },
        { wardNo: 196, name: 'Byrasandra', id: 'Jayanagar AC', budget: '18M', released: '16M', spent: '15.5M', areas: ['Byrasandra', 'Jayanagar 1st Block (part)'] },
        { wardNo: 197, name: 'Shakambari Nagar', id: 'Jayanagar AC', budget: '10M', released: '8M', spent: '7.5M', areas: ['J P Nagar 1st Phase', 'Sarakki (part)'] },
        { wardNo: 198, name: 'J P Nagar', id: 'Jayanagar AC', budget: '40M', released: '35M', spent: '32M', areas: ['2nd Phase', '3rd Phase', '6th Phase'] },
        { wardNo: 199, name: 'Sarakki', id: 'Jayanagar AC', budget: '22M', released: '19M', spent: '18M', areas: ['Sarakki', 'J P Nagar 1st Phase (part)'] },

        // Padmanaba Nagar AC (171)
        { wardNo: 200, name: 'Yediyur', id: 'Padmanaba Nagar AC', budget: '20M', released: '18M', spent: '17M', areas: ['Yediyur', 'Jayanagar 6th Block'] },
        { wardNo: 201, name: 'Umamaheshwari Ward', id: 'Padmanaba Nagar AC', budget: '12M', released: '10M', spent: '9.5M', areas: ['Chikkallasandra', 'Ittamadu'] },
        { wardNo: 202, name: 'Ganesh Mandir Ward', id: 'Padmanaba Nagar AC', budget: '8M', released: '6M', spent: '5.5M', areas: ['Hosakerehalli (part)', 'Banashankari 3rd Stage'] },
        { wardNo: 203, name: 'Banashankari Temple Ward', id: 'Padmanaba Nagar AC', budget: '28M', released: '24M', spent: '22M', areas: ['BSK 2nd Stage'] },
        { wardNo: 204, name: 'Kumaraswamy Layout', id: 'Padmanaba Nagar AC', budget: '15M', released: '13M', spent: '12M', areas: ['1st Stage', '2nd Stage'] },
        { wardNo: 205, name: 'Vikram Nagar', id: 'Padmanaba Nagar AC', budget: '11M', released: '9M', spent: '8.5M', areas: ['ISRO Layout', 'Kumaraswamy Layout (part)'] },
        { wardNo: 206, name: 'Padmanabha Nagar', id: 'Padmanaba Nagar AC', budget: '24M', released: '20M', spent: '19M', areas: ['Padmanabha Nagar', 'Chennammana Kere'] },
        { wardNo: 207, name: 'Kamakya Nagar', id: 'Padmanaba Nagar AC', budget: '24M', released: '20M', spent: '19M', areas: ['Kamakya', 'Banashankari 3rd Stage'] },
        { wardNo: 208, name: 'Deen Dayalu Ward', id: 'Padmanaba Nagar AC', budget: '11M', released: '9M', spent: '8.5M', areas: ['Tyagaraja Nagar', 'Basavanagudi (part)'] },
        { wardNo: 209, name: 'Hosakerehalli', id: 'Padmanaba Nagar AC', budget: '25M', released: '21M', spent: '20M', areas: ['Hosakerehalli', 'Ittamadu'] },

        // Basavanagudi AC (170)
        { wardNo: 210, name: 'Basavanagudi', id: 'Basavanagudi AC', budget: '30M', released: '25M', spent: '24M', areas: ['DVG Road', 'Gandhi Bazaar'] },
        { wardNo: 211, name: 'Hanumanth Nagar', id: 'Basavanagudi AC', budget: '16M', released: '14M', spent: '13M', areas: ['Hanumanth Nagar', 'Gavipuram'] },
        { wardNo: 212, name: 'Srinivasa Nagar', id: 'Basavanagudi AC', budget: '18M', released: '15M', spent: '14M', areas: ['Srinivasa Nagar', 'Banashankari 1st Stage'] },
        { wardNo: 213, name: 'Srinagar', id: 'Basavanagudi AC', budget: '20M', released: '17M', spent: '16M', areas: ['Srinagar', 'Banashankari 1st Stage'] },
        { wardNo: 214, name: 'Girinagar', id: 'Basavanagudi AC', budget: '22M', released: '19M', spent: '18M', areas: ['1st Phase', '2nd Phase', '3rd Phase'] },
        { wardNo: 215, name: 'Katriguppe', id: 'Basavanagudi AC', budget: '16M', released: '14M', spent: '13M', areas: ['Katriguppe', 'BSK 3rd Stage'] },
        { wardNo: 216, name: 'Vidyapeeta Ward', id: 'Basavanagudi AC', budget: '15M', released: '13M', spent: '12M', areas: ['Vidyapeetha', 'Chennammana Kere'] }
    ];

    const parseValue = (val) => parseFloat(val.toString().replace('M', ''));

    const displayWards = (wards && wards.length > 0) ? wards : defaultWards;

    return (
        <div className="premium-card" style={{ 
            padding: '0', 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            color: '#0f172a'
        }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#b91c1c' }}>
                <h3 className="premium-card-label" style={{ color: '#ffffff', margin: 0 }}>
                    🏛️ Ward Overview - South Zone ({displayWards.length} Wards)
                </h3>
            </div>
            <div style={{ padding: '16px', maxHeight: '500px', overflowY: 'auto' }} className="custom-scrollbar">
                {displayWards.map((w, idx) => {
                    const isFraud = w.isFraud || (parseValue(w.spent) > parseValue(w.budget));
                    return (
                        <div key={idx} className="ward-card" style={{ 
                            marginBottom: '16px', 
                            background: '#f8fafc', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '16px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ 
                                            background: '#3b82f6', 
                                            color: 'white', 
                                            padding: '2px 8px', 
                                            borderRadius: '4px', 
                                            fontSize: '12px', 
                                            fontWeight: 700 
                                        }}>
                                            #{w.wardNo}
                                        </span>
                                        <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{w.name}</h4>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{w.id || w.assemblyConstituency}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    {isFraud ? (
                                        <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '11px', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>⚠️ ANOMALY</span>
                                    ) : w.isLocked ? (
                                        <span style={{ color: '#ca8a04', fontWeight: 'bold', fontSize: '11px', background: '#fef9c3', padding: '2px 8px', borderRadius: '4px' }}>🔒 LOCKED</span>
                                    ) : (
                                        <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '11px', background: '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>✅ STABLE</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>Constituent Areas:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {(w.areas || []).slice(0, 5).map((area, aidx) => (
                                        <span key={aidx} style={{ 
                                            fontSize: '10px', 
                                            background: '#ffffff', 
                                            color: '#64748b', 
                                            padding: '1px 6px', 
                                            borderRadius: '4px',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            {area}
                                        </span>
                                    ))}
                                    {w.areas && w.areas.length > 5 && <span style={{ fontSize: '10px', color: '#94a3b8' }}>+{w.areas.length - 5} more</span>}
                                </div>
                            </div>

                            <div className="ward-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>₹{w.budget}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Released</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#ca8a04' }}>₹{w.released}</div>
                                </div>
                                <div style={{ background: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Spent</div>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: isFraud ? '#ef4444' : '#059669' }}>₹{w.spent}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
