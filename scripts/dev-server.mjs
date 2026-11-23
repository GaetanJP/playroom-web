// Zero-dependency static server that behaves like GitHub Pages:
// directories serve index.html, unknown paths serve 404.html with status 404.
// Usage: node scripts/dev-server.mjs [port] [--base playroom-web]
//   --base NAME mounts the site under /NAME/, to test a GitHub Pages project URL.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
// Last path segment only: Git Bash on Windows rewrites "/name" into "C:/Program Files/Git/name".
const base = baseIdx >= 0 ? '/' + args[baseIdx + 1].replace(/\\/g, '/').split('/').filter(Boolean).pop() : '';
const port = Number(args.find((a, i) => /^\d+$/.test(a) && i !== baseIdx + 1) || process.env.PORT || 4173);

const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
};

async function file(p) {
    try { return (await stat(p)).isFile() ? p : null; } catch { return null; }
}

createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (base) {
        if (path === base) { res.writeHead(301, { Location: base + '/' }); return res.end(); }
        if (!path.startsWith(base + '/')) { res.writeHead(404); return res.end('Outside --base'); }
        path = path.slice(base.length);
    }
    const target = normalize(join(root, path));
    let found = null;
    if (target === root || target.startsWith(root + sep)) {
        if (!/[\\/](\.git|node_modules|scripts)([\\/]|$)/.test(target.slice(root.length))) {
            found = await file(target);
            if (!found && (await file(join(target, 'index.html')))) {
                // Like GitHub Pages: /support → /support/ so relative links resolve.
                if (!path.endsWith('/')) {
                    res.writeHead(301, { Location: (base + path) + '/' });
                    return res.end();
                }
                found = join(target, 'index.html');
            }
        }
    }
    const status = found ? 200 : 404;
    const served = found || join(root, '404.html');
    res.writeHead(status, { 'Content-Type': types[extname(served)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(served));
}).listen(port, () => {
    console.log(`Playroom site on http://localhost:${port}${base}/`);
});
