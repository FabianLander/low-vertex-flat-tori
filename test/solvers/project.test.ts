/**
 * project validated against GROUND TRUTH — the math itself, not a legacy solver:
 *
 *   full space + [flat]                          → lands on the flat manifold
 *   pinned space + [flat, collinear, collinear]  → lands on the semi-solution locus
 *
 * Each landing is checked by the defining equations directly (cone deficit → 0,
 * planar signed area → 0, frozen z's exactly 0, a well-defined modulus), so the test
 * stands on the mathematics with no reference implementation.
 */

import { describe, it, expect } from 'vitest';
import { project } from '../../src/solvers/project.ts';
import { pinCoords } from '../../src/coordinates/pin.ts';
import { pullHeld } from '../../src/search/pull.ts';
import { flat, maxConeDeficit } from '../../src/constraints/flat.ts';
import { collinear } from '../../src/constraints/collinear.ts';
import { doyleSchwartzPositions } from '../../src/coordinates/doyleSchwartz.ts';
import { modulus } from '../../src/topology/develop.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/sampling/reference.ts';
import { perturb } from '../../src/sampling/perturb.ts';
import { mulberry32 } from '../../src/sampling/rng.ts';

const torus = byId(7);
const FROZEN_Z = [5, 8, 11, 14, 17, 20];

function area2(p: ArrayLike<number>, i: number, j: number, k: number): number {
  const oi = 3 * i, oj = 3 * j, ok = 3 * k;
  return (p[oj] - p[oi]) * (p[ok + 1] - p[oi + 1]) - (p[oj + 1] - p[oi + 1]) * (p[ok] - p[oi]);
}
const collinearity = (p: ArrayLike<number>) =>
  Math.max(Math.abs(area2(p, 1, 2, 3)), Math.abs(area2(p, 4, 5, 6)));

// Interior points of the DS fundamental domain.
const SEEDS = [
  { x: 0.30, y: 1.40 },
  { x: 0.20, y: 1.55 },
  { x: 0.40, y: 1.20 },
  { x: 0.10, y: 1.70 },
  { x: 0.45, y: 1.10 },
];

describe('project — full space + [flat] lands on the flat manifold', () => {
  it('flattens a perturbed Rich seed to cone deficit 0, with a well-defined modulus', () => {
    const seed = perturb(RICH_REFERENCE.positions, 0.05, mulberry32(12345));
    const p = seed.slice();
    const r = project(p, [flat(torus)]);

    expect(r.status).toBe('converged');
    expect(maxConeDeficit(torus, p)).toBeLessThan(1e-11);   // every cone angle = 2π
    const m = modulus(torus, p);
    expect(m.rotDefect).toBeLessThan(1e-6);                 // flat ⟹ pure-translation holonomy
    expect(m.tau[1]).toBeGreaterThan(0);                    // τ ∈ ℍ
  });
});

describe('project — pinned space + [flat, collinear×2] lands on the semi-solution locus', () => {
  const space = pinCoords(torus, FROZEN_Z);
  const constraints = pullHeld(space, [flat(torus), collinear(1, 2, 3), collinear(4, 5, 6)]);

  it('drives flatness AND the two collinearities to zero on ρ-broken DS seeds', () => {
    for (const { x, y } of SEEDS) {
      const seed = doyleSchwartzPositions(x, y);
      seed[0] += 0.05; seed[2] += 0.04;     // break ρ-symmetry on the tent poles
      seed[21] -= 0.03; seed[23] += 0.02;

      const xX = new Float64Array(space.dim);
      space.coords(seed, xX);
      const r = project(xX, constraints, { maxIters: 80 });
      const full = new Float64Array(24);
      space.push(xX, full);

      expect(r.status).toBe('converged');
      expect(maxConeDeficit(torus, full)).toBeLessThan(1e-11);   // flat
      expect(collinearity(full)).toBeLessThan(1e-11);            // both triples collinear
      for (const c of FROZEN_Z) expect(full[c]).toBe(0);         // base z's held at 0
      expect(modulus(torus, full).tau[1]).toBeGreaterThan(0);    // τ ∈ ℍ
    }
  });

  it('holds frozen coords at exactly 0 even when the seed dirties them', () => {
    const seed = doyleSchwartzPositions(0.3, 1.4);
    seed[0] += 0.08; seed[2] += 0.06; seed[21] += 0.05;
    seed[8] = 0.01;   // dirty a planar z — the chart must ignore it

    const xX = new Float64Array(space.dim);
    space.coords(seed, xX);   // ignores the dirty frozen coord
    project(xX, constraints, { maxIters: 80 });
    const full = new Float64Array(24);
    space.push(xX, full);

    for (const c of FROZEN_Z) expect(full[c]).toBe(0);
    expect(maxConeDeficit(torus, full)).toBeLessThan(1e-11);
  });
});
