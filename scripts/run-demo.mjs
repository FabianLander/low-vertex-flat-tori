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

const html = readFileSync(indexPath, 'utf8');
const updated = html.replace(
  /src="\/demos\/[^"]+\/main\.ts"/,
  `src="/demos/${demoName}/main.ts"`,
);
writeFileSync(indexPath, updated);
console.log(`→ ${demoName}`);

execSync(`npx vite ${command}`, { stdio: 'inherit', cwd: root });
