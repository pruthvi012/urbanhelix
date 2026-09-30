const fs = require('fs');
let content = fs.readFileSync('client/src/services/api.js', 'utf8');

const target = "const API_BASE = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api');";
const replacement = "const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';";

content = content.replace(target, replacement);
fs.writeFileSync('client/src/services/api.js', content, 'utf8');
console.log('Patched api.js');
