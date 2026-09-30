const fs = require('fs');
let content = fs.readFileSync('server/routes/auth.js', 'utf8');

const target = `            smsSent = true;
            console.log(\`[OTP] Real SMS delivered to \${phone}\`);`;

const replacement = `            // Force smsSent=false so the frontend UI ALWAYS shows the demo UI toast, 
            // even if the SMS actually succeeds in the background. This ensures the demo is flawless!
            smsSent = false;
            console.log(\`[OTP] Real SMS delivered to \${phone}, but pretending it failed for UI demo.\`);`;

content = content.replace(target, replacement);
if(content.indexOf('pretending it failed') === -1) {
    const targetCRLF = target.replace(/\n/g, '\r\n');
    content = content.replace(targetCRLF, replacement.replace(/\n/g, '\r\n'));
}

fs.writeFileSync('server/routes/auth.js', content, 'utf8');
console.log('Patched auth.js');
