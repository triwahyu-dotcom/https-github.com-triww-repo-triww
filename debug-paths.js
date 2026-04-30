const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
console.log("CWD:", cwd);

const dataDir = path.join(cwd, "data");
console.log("Data Dir:", dataDir);

if (fs.existsSync(dataDir)) {
    console.log("Data Dir exists");
    const files = fs.readdirSync(dataDir);
    console.log("Files in data dir:", files);
    
    const projectsPath = path.join(dataDir, "projects.json");
    if (fs.existsSync(projectsPath)) {
        console.log("projects.json exists");
        const stats = fs.statSync(projectsPath);
        console.log("projects.json size:", stats.size);
    } else {
        console.log("projects.json does NOT exist");
    }
} else {
    console.log("Data Dir does NOT exist");
}
