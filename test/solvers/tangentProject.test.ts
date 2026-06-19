/**
 * tangentProject (the kernel's QR-based tangent projection), checked against KNOWN
 * geometry (not old code): the projected vector lands in ker J, and P_T is idempotent.
 */

import { describe, it, expect } from 'vitest';
import { makeQR, tangentProject } from '@core/solvers/qr.ts';
import { mulberry32 } from '@core/sampling/rng.ts';

function dotJrow(jac: number[], cols: number, row: number, v: ArrayLike<number>): number {
  let s = 0;
  for (let c = 0; c < cols; c++) s += jac[row * cols + c] * v[c];
  return s;
}

describe('tangentProject', () => {
  it('sphere {‖x‖=1} in ℝ³: P_T v ⟂ the normal, and is idempotent', () => {
    const rng = mulberry32(7);
    const x = [0.3, -0.7, 0.64]; // any point; J = ∇(‖x‖²−1) = 2x (a 1×3 Jacobian)
    const jac = [2 * x[0], 2 * x[1], 2 * x[2]];
    const v = [rng() - 0.5, rng() - 0.5, rng() - 0.5];

    const qr = makeQR(1, 3);
    const pt = new Float64Array(3);
    tangentProject(qr, jac, 1, 3, v, pt);

    // Lands in ker J: J·(P_T v) ≈ 0  (tangent to the sphere at x).
    expect(Math.abs(dotJrow(jac, 3, 0, pt))).toBeLessThan(1e-9);

    // Idempotent: P_T(P_T v) = P_T v.
    const pt2 = new Float64Array(3);
    tangentProject(qr, jac, 1, 3, pt, pt2);
    let d = 0;
    for (let i = 0; i < 3; i++) d = Math.max(d, Math.abs(pt2[i] - pt[i]));
    expect(d).toBeLessThan(1e-9);

    // Removes only the normal component: P_T v = v − (v·n̂)n̂ for n̂ = x/‖x‖.
    const nlen = Math.hypot(x[0], x[1], x[2]);
    const nx = x.map((c) => c / nlen);
    const vn = v[0] * nx[0] + v[1] * nx[1] + v[2] * nx[2];
    for (let i = 0; i < 3; i++) {
      expect(pt[i]).toBeCloseTo(v[i] - vn * nx[i], 9);
    }
  });

  it('two constraints in ℝ⁴ (K=2): P_T v ⟂ both rows', () => {
    // g1 = x0²+x1²−1 → ∇ = (2x0,2x1,0,0); g2 = x2 → ∇ = (0,0,1,0).
    const x = [0.6, 0.8, 0.0, 0.5];
    const jac = [
      2 * x[0], 2 * x[1], 0, 0,
      0, 0, 1, 0,
    ];
    const v = [1.1, -0.4, 0.9, -0.7];
    const qr = makeQR(2, 4);
    const pt = new Float64Array(4);
    tangentProject(qr, jac, 2, 4, v, pt);

    expect(Math.abs(dotJrow(jac, 4, 0, pt))).toBeLessThan(1e-9);
    expect(Math.abs(dotJrow(jac, 4, 1, pt))).toBeLessThan(1e-9);

    const pt2 = new Float64Array(4);
    tangentProject(qr, jac, 2, 4, pt, pt2);
    let d = 0;
    for (let i = 0; i < 4; i++) d = Math.max(d, Math.abs(pt2[i] - pt[i]));
    expect(d).toBeLessThan(1e-9);
  });

  it('redundant constraint (duplicated row): the collapsed column is ignored, still projects to ker J', () => {
    const x = [0.3, -0.7, 0.64];
    const row = [2 * x[0], 2 * x[1], 2 * x[2]];
    const jac = [...row, ...row]; // rank-1 2×3 — the second column collapses under QR
    const v = [0.4, 0.9, -0.2];
    const qr = makeQR(2, 3);
    const pt = new Float64Array(3);
    tangentProject(qr, jac, 2, 3, v, pt);
    expect(qr.fullRank).toBe(false);                              // QR detects the rank deficiency
    expect(Math.abs(dotJrow(jac, 3, 0, pt))).toBeLessThan(1e-8);  // …but the projection is still correct
  });
});
