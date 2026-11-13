// Test-only HTTPS/static gateway. No Main key, trust-store change or public binding.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const work = 'F:/New folder/fooddelivery-admin-reports-20261113';
const root = path.resolve(work, 'frontend-dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
https.createServer({ key: fs.readFileSync(work + '/secrets/tls-key.pem'), cert: fs.readFileSync(work + '/secrets/tls-cert.pem') }, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url.startsWith('/api/')) {
    const headers = { ...req.headers, host: '127.0.0.1:18084' };
    delete headers.forwarded; delete headers['x-forwarded-for'];
    const upstream = http.request({ host: '127.0.0.1', port: 18084, method: req.method, path: req.url.slice(4), headers }, (reply) => {
      const outgoing = { ...reply.headers };
      if (outgoing['set-cookie']) outgoing['set-cookie'] = outgoing['set-cookie'].map((s) => s.replace(/Path=\/auth(?=;|$)/g, 'Path=/api/auth'));
      res.writeHead(reply.statusCode, outgoing); reply.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream); return;
  }
  let name;
  try { name = decodeURIComponent(new URL(req.url, 'https://127.0.0.1:18447').pathname); } catch { res.writeHead(400); res.end(); return; }
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
  const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(root, 'index.html');
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream'); fs.createReadStream(target).pipe(res);
}).listen(18447, '127.0.0.1', () => console.log(JSON.stringify({ testHttpsReady: true, port: 18447, publicBinding: false })));
