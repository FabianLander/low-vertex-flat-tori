/**
 * Search for flat embedded tori whose underlying triangulation is NOT Rich's.
 *
 * Rich's torus is combinatorial type #7 (the only degree-6-regular 8-vertex
 * type). The other six types (#1–#6) are exactly the triangulations that differ
 * from Rich's, so "flat embedded tori that don't share Rich's triangulation" =
 * the embedded-flat search run on types 1–6.
 *
 * Those six types have no reference embedding to perturb (only #7 does), so each
 * run uses `--seed-mode uniform` (i.i.d. random cube seeds). This driver just
 * fans the existing, battle-tested `sample-flat.mjs` out across the six types —
 * one child process per type, each writing its own CSV — so nothing about the
 * search itself is reimplemented here.
 *
 * Usage:
 *   npm run sample-flat-nonrich -- [options] [-- <extra sample-flat flags>]
 *
 * Driver options:
 *   --types LIST     Comma-separated types to search (default: 1,2,3,4,5,6)
 *   --out-dir DIR    Output directory (default: data/flat-nonrich)
 *   --seed N         Base RNG seed; type t uses seed (N + t) so streams differ
 *   --serial         Run the types one after another instead of all at once
 *
 * Any flag NOT consumed above is forwarded verbatim to every child, so e.g.
 *   npm run sample-flat-nonrich -- --max-accepts 2000 --step-size 0.0005
 * caps each type at 2000 saves and sets the flow step. (`--type`, `--out`,
 * `--seed`, `--seed-mode` are set per-type by the driver and cannot be
 * forwarded.)
 *
 * Output: <out-dir>/type-<t>-000.csv (rolls per --max-per-file, like sample-flat).
 * Ctrl-C forwards to all children, which flush their buffers and exit cleanly.
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const root = resolve(import.meta.dirname, '..');
const tsx = resolve(root, 'node_modules/.bin/tsx');
const child = resolve(root, 'scripts/sample-flat.mjs');

const argv = process.argv.slice(2);
function flag(name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}
function hasFlag(name) {
  return argv.indexOf(name) !== -1;
}

const types = (flag('--types') ?? '1,2,3,4,5,6')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n));
if (types.some((t) => t === 7)) {
  console.error('type 7 IS Rich\'s triangulation — exclude it (this search is the non-Rich types).');
  process.exit(1);
}
const outDir = resolve(flag('--out-dir') ?? 'data/flat-nonrich');
const baseSeed = Number(flag('--seed') ?? (Date.now() >>> 0));
const serial = hasFlag('--serial');

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// Forward everything the driver didn't consume. Drop driver-owned flags (and
// their values) plus the per-type flags the driver sets itself.
const DRIVER_VALUE_FLAGS = new Set(['--types', '--out-dir', '--seed']);
const PER_TYPE_FLAGS = new Set(['--type', '--out', '--seed-mode']); // driver sets these
const SKIP_VALUE = new Set([...DRIVER_VALUE_FLAGS, ...PER_TYPE_FLAGS]);
const forwarded = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--serial') continue;
  if (SKIP_VALUE.has(a)) { i++; continue; } // skip flag and its value
  forwarded.push(a);
}

function childArgs(t) {
  return [
    child,
    '--type', String(t),
    '--seed-mode', 'uniform',
    '--seed', String(baseSeed + t),
    '--out', resolve(outDir, `type-${t}`),
    ...forwarded,
  ];
}

const children = [];
function run(t) {
  return new Promise((res) => {
    const tag = `t${t}`;
    const proc = spawn(tsx, childArgs(t), { cwd: root });
    children.push(proc);
    const prefix = (chunk, stream) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.length) stream.write(`[${tag}] ${line}\n`);
      }
    };
    proc.stdout.on('data', (c) => prefix(c, process.stdout));
    proc.stderr.on('data', (c) => prefix(c, process.stderr));
    proc.on('exit', (code) => {
      console.log(`[${tag}] exited (code ${code})`);
      res(code ?? 0);
    });
  });
}

process.on('SIGINT', () => {
  console.log('\n— forwarding interrupt to all children —');
  for (const c of children) c.kill('SIGINT');
});

console.log('sample-flat-nonrich');
console.log(`  types:    ${types.join(', ')}   (non-Rich triangulations; #7 excluded)`);
console.log(`  seed mode: uniform   (types 1–6 have no reference embedding)`);
console.log(`  base seed: ${baseSeed}   (type t uses ${baseSeed}+t)`);
console.log(`  out:       ${outDir}/type-<t>-NNN.csv`);
console.log(`  mode:      ${serial ? 'serial' : 'parallel'}`);
if (forwarded.length) console.log(`  forwarded: ${forwarded.join(' ')}`);
console.log();

if (serial) {
  for (const t of types) await run(t);
} else {
  await Promise.all(types.map(run));
}
console.log('\n— all types done —');
