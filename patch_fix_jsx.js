const fs = require('fs');
const p = 'client/src/pages/ProjectDetail.jsx';
let c = fs.readFileSync(p, 'utf8');

// Find and fix the missing </> by replacing the spot just before the CITIZEN comment
const bad = `            {/* CITIZEN PROJECT REVIEW / FEEDBACK */}`;
const good = `            </>)}\n\n            {/* CITIZEN PROJECT REVIEW / FEEDBACK */}`;

if (c.includes(bad) && !c.includes(good)) {
    c = c.replace(bad, good);
    fs.writeFileSync(p, c, 'utf8');
    console.log('Fixed: added missing </>) before CITIZEN comment');
} else {
    console.log('Already fixed or pattern not found');
}
