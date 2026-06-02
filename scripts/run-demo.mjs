import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import net from 'net';

const root = resolve(import.meta.dirname, '..');
const demosDir = resolve(root, 'demos');
const indexPath = resolve(root, 'index.html');

const [command, demoName] = process.argv.slice(2);

if (!demoName) {
  const demos = readdirSync(demosDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  console.log('Usage: npm run dev <demo-name>\n');
  console.log('Available demos:');
  for (const d of demos) console.log(`  ${d}`);
  process.exit(1);
}

// Title-case the demo name for the page <title>: "develop-grid" → "Develop Grid".
const title = demoName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Build a demo's HTML from the tracked index.html template (keeps styling in
// one place) by swapping the entry script src and the <title>.
function htmlFor(name) {
  return readFileSync(indexPath, 'utf8')
    .replace(/src="\/demos\/[^"]+\/main\.ts"/, `src="/demos/${name}/main.ts"`)
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
