import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

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

const html = readFileSync(indexPath, 'utf8');
const updated = html
  .replace(/src="\/demos\/[^"]+\/main\.ts"/, `src="/demos/${demoName}/main.ts"`)
  .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
writeFileSync(indexPath, updated);
console.log(`→ ${demoName}`);

// Build each demo into its own self-contained subfolder dist/<demo>/ (relative
// paths, so it can be dropped into a site at any level). dev/preview use dist/.
const extra = command === 'build' ? ` --outDir dist/${demoName} --emptyOutDir` : '';
execSync(`npx vite ${command}${extra}`, { stdio: 'inherit', cwd: root });

if (command === 'build') console.log(`\n✓ self-contained build → dist/${demoName}/ (copy anywhere)`);
