import { describe, it, expect } from 'vitest';
import { semiSolutionFlatten, scanSemiSolutions } from './semiSolution';
import { doyleSchwartzPositions } from '../configuration/doyleSchwartz';
import { maxConeDeficit } from '../functions/coneDeficit.ts';
import { modulus } from '../topology/develop';
import { byId } from '../triangulations';
const torus = byId(7);

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
      // τ is defined up to the triangulation's chart; the DS construction is
      // built so the raw holonomy reads off x+iy directly.
      expect(tau[0]).toBeCloseTo(x, 6);
      expect(tau[1]).toBeCloseTo(y, 6);
    }
  });
});

describe('semiSolutionFlatten (constrained projection via newtonFlatten)', () => {
  it('is a near no-op on an unperturbed DS seed (already a semi-solution)', () => {
    for (const { x, y } of SEEDS) {
      const p = doyleSchwartzPositions(x, y);
      const r = semiSolutionFlatten(torus, p);
      expect(r.status).toBe('converged');
      expect(r.coneResidual).toBeLessThan(1e-12);
      expect(r.collinearResidual).toBeLessThan(1e-12);
    }
  });

  it('reconverges after a ρ-breaking perturbation of the tent poles', () => {
    for (const { x, y } of SEEDS) {
      const p = doyleSchwartzPositions(x, y);
      // Break ρ-symmetry: shift P0 and P7 independently.
      p[0] += 0.05; p[2] += 0.04;          // P0
      p[21] -= 0.03; p[23] += 0.02;        // P7
      const r = semiSolutionFlatten(torus, p);
      expect(r.status).toBe('converged');
      expect(r.coneResidual).toBeLessThan(1e-9);
      expect(r.collinearResidual).toBeLessThan(1e-9);
      // Cross-check against the actual geometry, not just the reported norms.
      expect(maxConeDeficit(torus, p)).toBeLessThan(1e-9);
      expect(collinearity(p)).toBeLessThan(1e-9);
    }
  });

  it('holds the planar z-coordinates frozen at exactly 0 throughout', () => {
    const p = doyleSchwartzPositions(0.3, 1.4);
    p[0] += 0.08; p[2] += 0.06; p[21] += 0.05;   // perturb the poles
    // Even if a caller hands in dirty planar z, the freeze pins them to 0.
    p[8] = 0.01;
    semiSolutionFlatten(torus, p);
    for (const c of FROZEN_Z) expect(p[c]).toBe(0);
  });
});

describe('scanSemiSolutions', () => {
  it('recovers the symmetric DS solution at zero perturbation', () => {
    const res = scanSemiSolutions(torus, {
      seeds: [{ x: 0.3, y: 1.4 }],
      perturbations: [{ dP0: [0, 0, 0], dP7: [0, 0, 0] }],
    });
    expect(res).toHaveLength(1);
    expect(res[0].converged).toBe(true);
    expect(res[0].tau![0]).toBeCloseTo(0.3, 6);
    expect(res[0].tau![1]).toBeCloseTo(1.4, 6);
  });

  it('returns one record per (seed × perturbation) and never throws on degenerate seeds', () => {
    const res = scanSemiSolutions(torus, {
      seeds: [{ x: 0.5, y: 1.5 }, { x: 0.3, y: 1.4 }],   // x=0.5 ⇒ coincident poles
      perturbations: [
        { dP0: [0, 0, 0], dP7: [0, 0, 0] },
        { dP0: [0.1, 0, 0], dP7: [-0.1, 0, 0] },
      ],
    });
    expect(res).toHaveLength(4);
    // Degenerate x=0.5 rows must be handled gracefully (no crash): either
    // not-converged (tau=null) or a NaN modulus, never a thrown error.
    for (const r of res) {
      if (r.converged && r.tau) {
        expect(Number.isFinite(r.coneResidual)).toBe(true);
      }
    }
  });
});
