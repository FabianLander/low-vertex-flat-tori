/**
 * Validate src/math/develop.ts on the Rich reference + every row of a CSV
 * (default data/explore-from-seeds/seeds.csv).
 *
 * For each torus we assert the development is sound and print its modulus:
 *   - covolume |v₁×v₂| must equal the intrinsic totalArea (unit-index basis +
 *     correct developing map);
 *   - rotDefect (max over cut edges) ≈ 0 (holonomy is a pure translation ⟺ flat);
 *   - maxConeDeficit (independent flatness check on the 3D embedding).
 *
 * Usage:  npx tsx scripts/develop-check.mjs [path/to.csv]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

import { VERTEX_COUNT } from '../src/math/topology.ts';
import { RICH_REFERENCE } from '../src/math/reference.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { modulus, developNet, reduceModulus } from '../src/math/develop.ts';

const DIM = VERTEX_COUNT * 3;
const inPath = resolve(process.argv[2] ?? 'data/explore-from-seeds/seeds.csv');

function rows(path) {
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length !== DIM) throw new Error(`expected ${DIM} floats, got ${nums.length}`);
    out.push(Float64Array.from(nums));
  }
  return out;
}

function check(label, p) {
  const net = developNet(p);
  const m = modulus(p);
  const covErr = Math.abs(m.covolume - m.area) / m.area;
  const tauStr = `${m.tau[0].toFixed(5)} + ${m.tau[1].toFixed(5)}i`;
  const red = reduceModulus(m.tau);
  const redStr = `${red[0].toFixed(5)} + ${red[1].toFixed(5)}i`;
  const ok = covErr < 1e-6 && m.rotDefect < 1e-6 && net.cutEdges.length === 9;
  console.log(
    `${ok ? '✓' : '✗'} ${label.padEnd(10)}  `
    + `cov.err=${covErr.toExponential(1)}  rotDef=${m.rotDefect.toExponential(1)}  `
    + `coneDef=${maxConeDeficit(p).toExponential(1)}  `
    + `τ=${tauStr}  →  τ̂=${redStr}`,
  );
  return ok;
}

console.log(`develop-check — ${inPath}\n`);
let allOk = check('rich', RICH_REFERENCE.positions);
const data = rows(inPath);
data.forEach((p, i) => { allOk = check(`row ${i}`, p) && allOk; });
console.log(`\n${allOk ? 'ALL PASS' : 'SOME FAILED'}  (${data.length} rows + rich)`);
process.exit(allOk ? 0 : 1);
