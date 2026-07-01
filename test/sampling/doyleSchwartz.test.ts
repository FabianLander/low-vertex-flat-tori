import { describe, it, expect } from 'vitest';
import { doyleSchwartzPositions } from '@core/sampling/doyleSchwartz.ts';
import { maxConeDeficit } from '@core/constraints/flat.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { byId } from '@core/triangulations/index.ts';

const torus = byId('v8-7');
const FROZEN_Z = [5, 8, 11, 14, 17, 20];

/** Twice the signed area of (Pi,Pj,Pk) in XY — zero iff collinear. */
function area2(p: ArrayLike<number>, i: number, j: number, k: number): number {
  const oi = 3 * i, oj = 3 * j, ok = 3 * k;
  return (p[oj] - p[oi]) * (p[ok + 1] - p[oi + 1]) - (p[oj + 1] - p[oi + 1]) * (p[ok] - p[oi]);
}
function collinearity(p: ArrayLike<number>): number {
  return Math.max(Math.abs(area2(p, 1, 2, 3)), Math.abs(area2(p, 4, 5, 6)));
}

// Interior points of the DS fundamental domain F = {x≥0, x≤½, (x−1)²+y²≥1}.
const SEEDS = [
  { x: 0.30, y: 1.40 },
  { x: 0.20, y: 1.55 },
  { x: 0.40, y: 1.20 },
  { x: 0.10, y: 1.70 },
  { x: 0.45, y: 1.10 },
];

describe('doyleSchwartzPositions (DS §2.2 golden pup tent)', () => {
  it('is a flat immersion: all 8 cone angles = 2π', () => {
    for (const { x, y } of SEEDS) {
      const p = doyleSchwartzPositions(x, y);
      expect(maxConeDeficit(torus, p)).toBeLessThan(1e-12);
    }
  });

  it('has both planar triples collinear and P1..P6 in the z=0 plane', () => {
    for (const { x, y } of SEEDS) {
      const p = doyleSchwartzPositions(x, y);
      expect(collinearity(p)).toBeLessThan(1e-12);
      for (const c of FROZEN_Z) expect(p[c]).toBe(0);
    }
  });

  it('satisfies the ρ-symmetry P7 = ρ(P0), ρ(u,v,w) = (−u,−v,w)', () => {
    for (const { x, y } of SEEDS) {
      const p = doyleSchwartzPositions(x, y);
      expect(p[21]).toBeCloseTo(-p[0], 12);
      expect(p[22]).toBeCloseTo(-p[1], 12);
      expect(p[23]).toBeCloseTo(p[2], 12);
    }
  });

  it('realizes modulus τ = x + iy', () => {
    for (const { x, y } of SEEDS) {
      const p = doyleSchwartzPositions(x, y);
      const { tau } = modulus(torus, p);
      // The DS construction is built so the raw holonomy reads off x+iy directly.
      expect(tau[0]).toBeCloseTo(x, 6);
      expect(tau[1]).toBeCloseTo(y, 6);
    }
  });
});
