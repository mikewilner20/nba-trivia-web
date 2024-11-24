const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'data', 'players.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Replace all double quotes with single quotes, except for nested quotes
content = content.replace(/(?<!\\)"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
    // If the string contains a single quote, keep double quotes
    if (p1.includes("'")) {
        return match;
    }
    return `'${p1}'`;
});

// Write back to file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully converted quotes in players.js');
