const fs = require('fs');

const logPath = 'c:\\Users\\pruth\\Desktop\\myproject\\UrabanHelixX\\scratch\\debug.log';

async function testEngineer() {
    try {
        console.log("Login as engineer...");
        const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'engineer@bbmp.gov.in', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Token received:", token ? "Yes" : "No");

        console.log("Fetching wards...");
        const wardsRes = await fetch('http://127.0.0.1:5000/api/wards', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const wardsData = await wardsRes.json();
        console.log("Wards response status:", wardsRes.status);
        console.log("Wards fetched:", wardsData.wards?.length);
        
        console.log("Fetching projects...");
        const projRes = await fetch('http://127.0.0.1:5000/api/projects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const projData = await projRes.json();
        console.log("Projects response status:", projRes.status);
        console.log("Projects fetched:", projData.projects?.length);

    } catch(e) {
        console.error(e);
    }
}

testEngineer();
