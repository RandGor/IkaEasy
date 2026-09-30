// Run: node scripts/serve-empire-scroll.cjs, then open the printed URL.
// The browser fixture runs the production modules and reports PASS/FAIL.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || !/^\/(scripts\/fixtures|js|css|images|lang|tpl)\//.test(pathname) && pathname !== '/options.js') {
        response.writeHead(403).end(); return;
    }
    fs.readFile(file, (error, data) => {
        if (error) { response.writeHead(404).end(); return; }
        response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
        response.setHeader('Cache-Control', 'no-store');
        response.end(data);
    });
}).listen(8766, '127.0.0.1', () => console.log('Empire fixture: http://127.0.0.1:8766/scripts/fixtures/empire-scroll.html'));
