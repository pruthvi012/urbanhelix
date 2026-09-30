const fs = require('fs');
let content = fs.readFileSync('server/routes/ai.js', 'utf8');

const replacement = `        let answer;
        if (matched.length > 0) {
            const summary = matched.slice(0, 5).map(p => {
                const status = p.status === 'completed' ? '[Completed]' :
                               p.status === 'in_progress' ? '[In Progress]' :
                               p.status === 'delayed' ? '[Delayed]' : \`[\${p.status}]\`;
                return \`- \${p.title} : \${status}\`;
            }).join('\\n');
            answer = \`Here's what I found:\\n\\n\${summary}\`;
        } else if (isGeneralList && projects.length > 0) {
            const summary = projects.slice(0, 5).map(p => {
                const status = p.status === 'completed' ? '[Completed]' :
                               p.status === 'in_progress' ? '[In Progress]' :
                               p.status === 'delayed' ? '[Delayed]' : \`[\${p.status}]\`;
                return \`- \${p.title} (\${p.location?.ward || 'Citywide'}) : \${status}\`;
            }).join('\\n');
            answer = \`Currently, there are \${projects.length} active projects going on citywide. Here are some of them:\\n\\n\${summary}\`;
        } else if (projects.length > 0) {
            answer = \`No project found in this area or ward. Currently, there are \${projects.length} active projects citywide.\`;
        } else {
            answer = \`No project data available right now. Please check the Projects section for live updates.\`;
        }
        res.json({ success: true, answer });`;

// Find everything from 'let answer;' to the res.json line
const startStr = "let answer;";
const endStr = "res.json({ success: true, answer });";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync('server/routes/ai.js', newContent, 'utf8');
    console.log('Patched ai.js encoding successfully');
}
