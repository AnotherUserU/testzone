const fs = require('fs');
const content = fs.readFileSync('admin.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/g);
if (scriptMatch) {
    scriptMatch.forEach((s, i) => {
        const code = s.replace('<script>', '').replace('</script>', '');
        try {
            new Function(code);
            console.log(`Script ${i} is OK`);
        } catch (e) {
            console.error(`Script ${i} has error:`, e.message);
            // Try to find the line number
            const lines = code.split('\n');
            // This is a very rough way to find the error line
        }
    });
}
