/**
 * flat — the flatness condition, end to end: the cone-angle deficit *measurement*
 * of a realization, and the *constraint* that drives it to zero.
 *
 * A realization is flat iff every vertex's cone angle is exactly 2π. The
 * measurement δ(c) ∈ ℝⱽ, δ_v = 2π − θ_v, is the load-bearing quantity — it is read
 * in several roles: as the flatness *constraint* (`flat`, below), as the flatness
 * *certificate* (`maxConeDeficit`), and as per-vertex *coloring* in the viewer.
 * The module owns the measurement and exports it for all of them.
 *
 * Pure functions on a positions array (length V·3, layout [x0,y0,z0, …]; accepts
 * Float64Array or Float32Array). No three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Fn } from '@core/functions/types.ts';
import { cornerAngle } from '@core/geometry/triangle.ts';
import type { Held } from './types.ts';

const TWO_PI = Math.PI * 2;

// ─── the measurement ────────────────────────────────────────────────────────

/** Cone angle θ_i: the sum of corner angles at vertex i over its incident triangles. */
export function coneAngleAt(triang: Triangulation, positions: ArrayLike<number>, i: number): number {
  const link = triang.vertexLinks[i];
  const oi = 3 * i;
  const xi = positions[oi], yi = positions[oi + 1], zi = positions[oi + 2];
  let total = 0;
  for (let k = 0; k < link.length; k++) {
    const oj = 3 * link[k], ol = 3 * link[(k + 1) % link.length];
    total += cornerAngle(
      xi, yi, zi,
      positions[oj], positions[oj + 1], positions[oj + 2],
      positions[ol], positions[ol + 1], positions[ol + 2],
    );
  }
  return total;
}

/** All V cone angles. */
export function coneAngles(triang: Triangulation, positions: ArrayLike<number>, out?: Float64Array): Float64Array {
  const r = out ?? new Float64Array(triang.vertexCount);
  for (let i = 0; i < triang.vertexCount; i++) r[i] = coneAngleAt(triang, positions, i);
  return r;
}

/** Per-vertex deficit δ_i = 2π − θ_i. Zero at every vertex ⟺ the realization is flat. */
export function coneAngleDeficits(triang: Triangulation, positions: ArrayLike<number>, out?: Float64Array): Float64Array {
  const r = out ?? new Float64Array(triang.vertexCount);
  for (let i = 0; i < triang.vertexCount; i++) r[i] = TWO_PI - coneAngleAt(triang, positions, i);
  return r;
}

/** max_i |δ_i| — the flatness residual (the certificate, and `project`'s convergence test for `flat`). */
export function maxConeDeficit(triang: Triangulation, positions: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < triang.vertexCount; i++) {
    const d = Math.abs(TWO_PI - coneAngleAt(triang, positions, i));
    if (d > m) m = d;
  }
  return m;
}

/**
 * Analytic Jacobian of the deficits δ_i = 2π − θ_i: writes out[i·N + c] = ∂δ_i/∂x_c
 * for every vertex i and coordinate c, row-major with stride N = V·3.
 *
 * Per corner (apex i, consecutive link-neighbors j, l) this is geometry's
 * `cornerAngleGrad` — see it for the readable formula and its FD test. It is written
 * out INLINE here ON PURPOSE: this is the hottest function in the search (one Jacobian
 * per solver step), and returning the 9 gradient components through out-params instead
 * of registers measured ~25% slower. The clean form this inlines is:
 *
 *     cornerAngleGrad(Pi, Pj, Pl, ga, gb, gc);   // ga=∂α/∂Pi, gb=∂α/∂Pj, gc=∂α/∂Pl
 *     out[i] -= ga; out[j] -= gb; out[l] -= gc;   // δ = −θ ⟹ subtract
 *
 * δ_i = −θ_i + const, so contributions accumulate with a leading minus; a link-neighbor
 * is the `l` of one corner and the `j` of the next, so both land in its slot. Collinear
 * corners (zero area) are skipped. KEEP IN SYNC with `cornerAngleGrad` — `flat.test.ts`
 * cross-checks this against finite differences.
 */
export function coneAngleJacobian(triang: Triangulation, positions: ArrayLike<number>, out: Float64Array): void {
  const N_COORDS = triang.vertexCount * 3;
  out.fill(0);
  for (let i = 0; i < triang.vertexCount; i++) {
    const link = triang.vertexLinks[i];
    const oi = 3 * i;
    const xi = positions[oi], yi = positions[oi + 1], zi = positions[oi + 2];
    const row = i * N_COORDS;
    for (let k = 0; k < link.length; k++) {
      const j = link[k], l = link[(k + 1) % link.length];
      const oj = 3 * j, ol = 3 * l;
      const ux = positions[oj] - xi, uy = positions[oj + 1] - yi, uz = positions[oj + 2] - zi;
      const vx = positions[ol] - xi, vy = positions[ol + 1] - yi, vz = positions[ol + 2] - zi;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; // N̂ = unit(u × v)
      const nmag = Math.hypot(nx, ny, nz);
      if (nmag < 1e-300) continue;                 // collinear arms: degenerate corner, skip
      const inv = 1 / nmag; nx *= inv; ny *= inv; nz *= inv;
      const u2 = ux * ux + uy * uy + uz * uz, v2 = vx * vx + vy * vy + vz * vz;
      const gjx = -(ny * uz - nz * uy) / u2, gjy = -(nz * ux - nx * uz) / u2, gjz = -(nx * uy - ny * ux) / u2;
      const glx =  (ny * vz - nz * vy) / v2, gly =  (nz * vx - nx * vz) / v2, glz =  (nx * vy - ny * vx) / v2;
      const gix = -(gjx + glx), giy = -(gjy + gly), giz = -(gjz + glz);
      out[row + oi] -= gix; out[row + oi + 1] -= giy; out[row + oi + 2] -= giz;
      out[row + oj] -= gjx; out[row + oj + 1] -= gjy; out[row + oj + 2] -= gjz;
      out[row + ol] -= glx; out[row + ol + 1] -= gly; out[row + ol + 2] -= glz;
    }
  }
}

/** The cone-deficit map as an `Fn` (dim V): value = the V deficits, jacobian = the analytic derivative. */
export function coneDeficit(triang: Triangulation): Fn {
  return {
    label: 'coneDeficit',
    dim: triang.vertexCount,
    value: (c, out) => { coneAngleDeficits(triang, c, out); },
    jacobian: (c, out) => { coneAngleJacobian(triang, c, out); },
  };
}

// ─── the constraint ─────────────────────────────────────────────────────────

/**
 * Flatness as a closed condition: every cone-angle deficit = 0. **codim = V−1.**
 *
 * Gauss–Bonnet forces Σ deficits ≡ 0, so the flat locus is codim V−1, not V — the
 * V-th deficit is `−(sum of the others)`. `flat` is `coneDeficit` as a `Held` that
 * drives the first V−1 rows (full-rank, well-conditioned; reproduces `newtonFlatten`,
 * which drops the same row). No custom convergence measure is needed: the solver's
 * default ‖value‖∞ over all V rows of `coneDeficit` IS `maxConeDeficit`, so the
 * dropped deficit cannot lag above tolerance unseen.
 */
export function flat(triang: Triangulation): Held {
  return { fn: coneDeficit(triang), drive: triang.vertexCount - 1 };
}
