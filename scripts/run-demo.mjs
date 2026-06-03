import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import net from 'net';

const root = resolve(import.meta.dirname, '..');
const indexPath = resolve(root, 'index.html');

// A view can live in demos/ (interactive tools for the search) or renders/
// (render-oriented views, e.g. the path tracer). Both are discovered the same way.
const BASE_DIRS = ['demos', 'renders'];

function listViews() {
  const out = [];
  for (const base of BASE_DIRS) {
    const dir = resolve(root, base);
    if (!existsSync(dir)) continue;
    for (const d of readdirSync(dir, { withFileTypes: true })) if (d.isDirectory()) out.push({ base, name: d.name });
  }
  return out;
}
function baseFor(name) {
  for (const base of BASE_DIRS) if (existsSync(resolve(root, base, name, 'main.ts'))) return base;
  return null;
}

const [command, demoName] = process.argv.slice(2);

if (!demoName) {
  console.log('Usage: npm run dev <name>\n');
  console.log('Available:');
  for (const { base, name } of listViews()) console.log(`  ${name.padEnd(20)} (${base}/)`);
  process.exit(1);
}

const base = baseFor(demoName);
if (!base) {
  console.error(`'${demoName}' not found in ${BASE_DIRS.map((d) => d + '/').join(' or ')}`);
  process.exit(1);
}

// Title-case the name for the page <title>: "develop-grid" → "Develop Grid".
const title = demoName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Build the HTML from the tracked index.html template (keeps styling in one
// place) by swapping the entry script src (to demos/ or renders/) and the <title>.
function htmlFor(name) {
  return readFileSync(indexPath, 'utf8')
    .replace(/src="\/(?:demos|renders)\/[^"]+\/main\.ts"/, `src="/${base}/${name}/main.ts"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
}

// A stable port per demo, derived from its name (djb2 hash → 5200–5599). Each
// demo therefore ALWAYS lives at the same URL, and two different demos never
// land on the same port — so you can run them in separate terminals in parallel
// without their addresses colliding or depending on startup order.
function portFor(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h * 33) ^ name.charCodeAt(i)) >>> 0;
  return 5200 + (h % 400);
}

// Is a server already reachable on this port? Connect to `localhost` (the same
// host vite binds) rather than binding a probe socket ourselves, so we match
// whichever address family vite uses (127.0.0.1 vs ::1).
function portInUse(port) {
  return new Promise((res) => {
    const sock = net.connect({ port, host: 'localhost' });
    sock.setTimeout(500);
    sock.once('connect', () => { sock.destroy(); res(true); });
    sock.once('timeout', () => { sock.destroy(); res(false); });
    sock.once('error', () => res(false));
  });
}

if (command === 'dev') {
  // Each `dev` run gets its OWN html entry under .dev/ (gitignored) instead of
  // rewriting the shared index.html. That file is read live by vite on every
  // request, so two concurrent `dev` servers pointed at it would both serve
  // whichever demo was started last. Per-demo entries make them independent.
  const devDir = resolve(root, '.dev');
  mkdirSync(devDir, { recursive: true });
  const entry = `.dev/${demoName}.html`;
  writeFileSync(resolve(root, entry), htmlFor(demoName));

  const port = portFor(demoName);
  const url = `http://localhost:${port}/${entry}`;
  if (await portInUse(port)) {
    // Most likely this same demo is already running (the port is demo-specific).
    console.log(`→ ${demoName} appears to be running already: ${url}`);
    process.exit(0);
  }
  console.log(`→ ${demoName} (dev) — ${url}`);
  // --strictPort: never silently drift to another port, so the URL above is
  // always THE address for this demo.
  execSync(`npx vite --port ${port} --strictPort --open /${entry}`, { stdio: 'inherit', cwd: root });
} else {
  // build / preview run one at a time and produce a self-contained dist/<demo>/,
  // so rewriting the shared index.html entry here is fine.
  writeFileSync(indexPath, htmlFor(demoName));
  console.log(`→ ${demoName}`);
  const extra = command === 'build' ? ` --outDir dist/${demoName} --emptyOutDir` : '';
  execSync(`npx vite ${command}${extra}`, { stdio: 'inherit', cwd: root });
  if (command === 'build') console.log(`\n✓ self-contained build → dist/${demoName}/ (copy anywhere)`);
}
