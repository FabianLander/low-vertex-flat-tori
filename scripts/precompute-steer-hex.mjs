/**
 * Precompute steerModulus trajectories toward the hexagonal torus ρ = e^{iπ/3} = (½, √3/2)
 * (a cube root of −1), for the Demo A animation. Picks ~100 embedded tori from
 * data/explore-from-seeds spanning a range of distances from ρ, steers each toward ρ recording
 * its path through ℍ, and writes the trajectories to demos/steer-modulus/data/trajectories.json.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { RICH } from '@core/triangulations';
import { modulus } from '@core/moduli/modulus.ts';
import { isEmbedded } from '@core/embedding/index.ts';
import { steerModulus } from '@core/search/steer-modulus.ts';

const HEX = [0.5, Math.sqrt(3) / 2];                 // ρ = e^{iπ/3}, the hex torus modulus
const tau = (p) => modulus(RICH, p).tau;
const dist = (t) => Math.hypot(t[0] - HEX[0], t[1] - HEX[1]);

// load all embedded tori, with their distance to ρ
const dir = 'data/explore-from-seeds';
const cands = [];
for (const fn of readdirSync(dir).filter((f) => /^seed-\d+\.csv$/.test(f))) {
  const rows = readFileSync(`${dir}/${fn}`, 'utf8').trim().split('\n');
  for (let i = 0; i < rows.length; i += 9) {                 // subsample for speed
    const p = Float64Array.from(rows[i].split(',').map(Number));
    if (p.length !== 24 || !isEmbedded(RICH, p)) continue;
    cands.push({ p, d: dist(tau(p)) });
  }
}
cands.sort((a, b) => a.d - b.d);
const near = cands.filter((c) => c.d <= 0.7);   // not too far from ρ (the slow far seeds barely move — drop them)
console.log(`candidates ${cands.length}; ${near.length} within 0.7 of ρ (${near[0].d.toFixed(3)} .. ${near[near.length - 1].d.toFixed(3)})`);

// pick N spread evenly across the (capped) distance range — all sorts of distances
const N = Number(process.argv[2]) || 100;
const picked = [];
for (let k = 0; k < N; k++) picked.push(near[Math.floor((k / N) * near.length)]);

// steer each toward ρ, recording its trajectory through ℍ
const paths = [];
let done = 0, reached = 0;
for (const { p, d } of picked) {
  const traj = [];
  const m = steerModulus(RICH, HEX, { onRound: (t) => traj.push([t[0], t[1]]) })(p.slice());
  if (m) reached++;
  paths.push({ start: d, traj, reached: !!m });
  if (++done % 10 === 0) console.log(`  ${done}/${N}  (${reached} reached so far)`);
}

mkdirSync('demos/steer-modulus/data', { recursive: true });
writeFileSync('demos/steer-modulus/data/trajectories.json', JSON.stringify({ target: HEX, paths }));
console.log(`wrote ${paths.length} trajectories (${reached} reached) → demos/steer-modulus/data/trajectories.json`);
