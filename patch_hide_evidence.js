const fs = require('fs');
const uiPath = 'client/src/pages/ProjectDetail.jsx';
let uiContent = fs.readFileSync(uiPath, 'utf8');

const target1 = `            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="glass-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Visual Evidence</h3>`;

const replace1 = `            {user?.role !== 'citizen' && (
            <div className="grid-2" style={{ marginBottom: '24px' }}>
                <div className="glass-card">
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Visual Evidence</h3>`;

const target2 = `                    </div>
                </div>
            </div>

            
            {/* CITIZEN PROJECT REVIEW / FEEDBACK */}`;

const replace2 = `                    </div>
                </div>
            </div>
            )}

            
            {/* CITIZEN PROJECT REVIEW / FEEDBACK */}`;

if (uiContent.includes(target1) && uiContent.includes(target2)) {
    uiContent = uiContent.replace(target1, replace1).replace(target2, replace2);
    fs.writeFileSync(uiPath, uiContent, 'utf8');
    console.log('Successfully hid evidence sections for citizens.');
} else {
    console.log('Targets not found. Make sure the strings match exactly.');
}
