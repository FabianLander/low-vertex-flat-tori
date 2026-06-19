/**
 * Phase-B: the analytic ∂τ/∂p (`tauJacobian`) must (a) match central finite differences
 * of `modulus().tau` to ~1e-6, and (b) annihilate the 7 similarity generators — τ is
 * invariant under translation (×3), rotation (×3), and uniform scale, so the exact
 * Jacobian kills those directions to ~machine precision (FD only manages ~1e-6).
 */

import { describe, it, expect } from 'vitest';
import { modulus, tauJacobian } from '@core/moduli/modulus';
import { project } from '@core/solvers/project.ts';
import { flat, maxConeDeficit } from '@core/constraints/flat.ts';
import { ALL_TORI, RICH } from '@core/triangulations';
import { RICH_REFERENCE } from '@core/sampling/reference';
import { mulberry32 } from '@core/sampling/rng';
import type { Triangulation } from '@core/topology/triangulation.ts';

function analytic(triang: Triangulation, p: ArrayLike<number>): Float64Array {
  const out = new Float64Array(2 * triang.vertexCount * 3);
  tauJacobian(triang, p, out);
  return out;
}

/** Central-difference Jacobian of modulus().tau (the FD oracle this replaces). */
function fd(triang: Triangulation, p: ArrayLike<number>, h = 1e-7): Float64Array {
  const n = triang.vertexCount * 3;
  const out = new Float64Array(2 * n);
  const q = Float64Array.from(p);
  for (let j = 0; j < n; j++) {
    const s = q[j];
    q[j] = s + h; const tp = modulus(triang, q).tau;
    q[j] = s - h; const tm = modulus(triang, q).tau;
    q[j] = s;
    out[j] = (tp[0] - tm[0]) / (2 * h);
    out[n + j] = (tp[1] - tm[1]) / (2 * h);
  }
  return out;
}

function maxDiff(a: Float64Array, b: Float64Array): number {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

/** [∂Reτ·dir, ∂Imτ·dir] — the Jacobian (2×n) contracted with a direction. */
function contract(J: Float64Array, dir: Float64Array, n: number): [number, number] {
  let r0 = 0, r1 = 0;
  for (let i = 0; i < n; i++) { r0 += J[i] * dir[i]; r1 += J[n + i] * dir[i]; }
  return [r0, r1];
}

/** A flat realization of `torus` from a fixed seed (the teichmuller.test pattern). */
function flatSample(torus: Triangulation, seed: number): Float64Array {
  const n = torus.vertexCount * 3;
  const rng = mulberry32(seed);
  for (let attempt = 0; attempt < 16; attempt++) {
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = rng() * 2 - 1;
    const r = project(x, [flat(torus)], { tolerance: 1e-12, maxIters: 100 });
    if (r.status === 'converged' && maxConeDeficit(torus, x) < 1e-7 && modulus(torus, x).area > 1e-2) return x;
  }
  throw new Error(`no flat sample for #${torus.id}`);
}

describe('analytic tauJacobian', () => {
  it('matches finite differences on the RICH reference', () => {
    const p = RICH_REFERENCE.positions;
    expect(maxDiff(analytic(RICH, p), fd(RICH, p))).toBeLessThan(1e-6);
  });

  it('matches finite differences on projected-flat samples (types 1, 3, 7)', () => {
    for (const id of [1, 3, 7]) {
      const torus = ALL_TORI[id - 1];
      const p = flatSample(torus, 5000 + id);
      expect(maxDiff(analytic(torus, p), fd(torus, p)), `#${id}`).toBeLessThan(1e-5);
    }
  });

  it('annihilates the 7 similarity generators (exact invariances)', () => {
    const samples: { torus: Triangulation; p: ArrayLike<number> }[] = [
      { torus: RICH, p: RICH_REFERENCE.positions },
      { torus: ALL_TORI[0], p: flatSample(ALL_TORI[0], 6001) },
      { torus: ALL_TORI[2], p: flatSample(ALL_TORI[2], 6003) },
    ];
    for (const { torus, p } of samples) {
      const n = torus.vertexCount * 3, V = torus.vertexCount;
      const J = analytic(torus, p);

      // 3 translations: ∂ℓ along a uniform shift is exactly 0 ⟹ ∂τ exactly 0.
      for (let axis = 0; axis < 3; axis++) {
        const d = new Float64Array(n);
        for (let v = 0; v < V; v++) d[3 * v + axis] = 1;
        const [r0, r1] = contract(J, d, n);
        expect(Math.hypot(r0, r1), `#${torus.id} translation ${axis}`).toBeLessThan(1e-9);
      }

      // 3 rotations about the origin (infinitesimal-rotation fields): also exactly 0.
      const rot: ((v: number) => [number, number, number])[] = [
        (v) => [0, -p[3 * v + 2], p[3 * v + 1]],   // about x
        (v) => [p[3 * v + 2], 0, -p[3 * v]],       // about y
        (v) => [-p[3 * v + 1], p[3 * v], 0],       // about z
      ];
      for (let r = 0; r < 3; r++) {
        const d = new Float64Array(n);
        for (let v = 0; v < V; v++) { const w = rot[r](v); d[3 * v] = w[0]; d[3 * v + 1] = w[1]; d[3 * v + 2] = w[2]; }
        const [r0, r1] = contract(J, d, n);
        expect(Math.hypot(r0, r1), `#${torus.id} rotation ${r}`).toBeLessThan(1e-9);
      }

      // uniform scale (radial field = p): τ scale-invariant ⟹ 0 by cancellation.
      const ds = Float64Array.from(p);
      const [s0, s1] = contract(J, ds, n);
      expect(Math.hypot(s0, s1), `#${torus.id} scale`).toBeLessThan(1e-7);
    }
  });
});
