const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png', '.gif':'image/gif' };
http.createServer((req,res)=>{
    let file;
    try { file = path.resolve(root, '.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname)); }
    catch { res.writeHead(400).end(); return; }
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{
        if(error){res.writeHead(404).end();return;}
        res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
        res.end(data);
    });
}).listen(8767,'127.0.0.1',()=>console.log('Mascot fixtures: http://127.0.0.1:8767/scripts/fixtures/city-mascot.html'));
