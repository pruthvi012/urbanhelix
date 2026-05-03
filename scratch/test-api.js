async function test() {
    try {
        console.log("Testing /api/wards...");
        let res = await fetch('http://127.0.0.1:5000/api/wards');
        let data = await res.json();
        console.log("Wards:", data.wards?.length || data);

        console.log("Testing /api/departments...");
        res = await fetch('http://127.0.0.1:5000/api/departments');
        data = await res.json();
        console.log("Departments:", data.departments?.length || data);

        console.log("Testing /api/projects...");
        res = await fetch('http://127.0.0.1:5000/api/projects');
        data = await res.json();
        console.log("Projects:", data.projects?.length || data);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
