// Build gate for a no-build static site: every page parses its local links and assets,
// and each must resolve to a real file. Also refuses obvious secrets in committed files.
// Usage: node scripts/check.mjs
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pages = ['index.html', 'privacy/index.html', 'support/index.html'];
const problems = [];

async function exists(p) {
    try {
        const s = await stat(p);
        return s.isFile() || (s.isDirectory() && (await exists(join(p, 'index.html'))));
    } catch { return false; }
}

for (const page of pages) {
    const html = await readFile(join(root, page), 'utf8');
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
        if (/^(https?:|mailto:|tel:|playroom:|data:)/.test(url)) continue;
        const [path, hash] = url.split('#');
        if (!path) {
            if (hash && !ids.has(hash)) problems.push(`${page}: #${hash} has no matching id`);
            continue;
        }
        const target = resolve(dirname(join(root, page)), path);
        if (!(await exists(target))) problems.push(`${page}: ${url} → missing ${relative(root, target)}`);
    }
}

// Secrets never belong in this repo (everything here is served publicly).
const secretPatterns = [/service_role/i, /SUPABASE_SERVICE/i, /sk_live_|sk_test_/, /postgres(ql)?:\/\/[^\s'"]*:[^\s'"]*@/i, /eyJ[a-zA-Z0-9_-]{20,}\.eyJ/];
async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        if (['.git', 'node_modules'].includes(entry.name)) continue;
        const p = join(dir, entry.name);
        if (entry.isDirectory()) await walk(p);
        else if (/\.(html|js|mjs|css|json|md)$/.test(entry.name) && !p.endsWith('check.mjs')) {
            const text = await readFile(p, 'utf8');
            for (const re of secretPatterns) if (re.test(text)) problems.push(`${relative(root, p)}: looks like a secret (${re})`);
        }
    }
}
await walk(root);

if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
}
console.log(`OK: ${pages.length} pages, all local links resolve, no secrets found.`);
