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

import type { Triangulation } from '../topology/triangulation.ts';
import type { Fn } from '../functions/types.ts';
import type { Held } from '../solvers/types.ts';

const TWO_PI = Math.PI * 2;

// ─── the measurement ────────────────────────────────────────────────────────

/** Cone angle θ_i: the sum of corner angles at vertex i over its incident triangles. */
export function coneAngleAt(torus: Triangulation, positions: ArrayLike<number>, i: number): number {
  const link = torus.vertexLinks[i];
  const oi = 3 * i;
  const xi = positions[oi], yi = positions[oi + 1], zi = positions[oi + 2];
  let total = 0;
  for (let k = 0; k < link.length; k++) {
    const j = link[k];
    const l = link[(k + 1) % link.length];
    const oj = 3 * j, ol = 3 * l;
    const ex = positions[oj] - xi, ey = positions[oj + 1] - yi, ez = positions[oj + 2] - zi;
    const fx = positions[ol] - xi, fy = positions[ol + 1] - yi, fz = positions[ol + 2] - zi;
    const dot = ex * fx + ey * fy + ez * fz;
    const me = Math.hypot(ex, ey, ez);
    const mf = Math.hypot(fx, fy, fz);
    let cos = dot / (me * mf);
    if (cos > 1) cos = 1; else if (cos < -1) cos = -1;
    total += Math.acos(cos);
  }
  return total;
}

/** All V cone angles. */
export function coneAngles(torus: Triangulation, positions: ArrayLike<number>, out?: Float64Array): Float64Array {
  const r = out ?? new Float64Array(torus.vertexCount);
  for (let i = 0; i < torus.vertexCount; i++) r[i] = coneAngleAt(torus, positions, i);
  return r;
}

/** Per-vertex deficit δ_i = 2π − θ_i. Zero at every vertex ⟺ the realization is flat. */
export function coneAngleDeficits(torus: Triangulation, positions: ArrayLike<number>, out?: Float64Array): Float64Array {
  const r = out ?? new Float64Array(torus.vertexCount);
  for (let i = 0; i < torus.vertexCount; i++) r[i] = TWO_PI - coneAngleAt(torus, positions, i);
  return r;
}

/** max_i |δ_i| — the flatness residual (the certificate, and `project`'s convergence test for `flat`). */
export function maxConeDeficit(torus: Triangulation, positions: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < torus.vertexCount; i++) {
    const d = Math.abs(TWO_PI - coneAngleAt(torus, positions, i));
    if (d > m) m = d;
  }
  return m;
}

/**
 * Analytic Jacobian of the deficits δ_i = 2π − θ_i: writes out[i·N + c] = ∂δ_i/∂x_c
 * for every vertex i and coordinate c, row-major with stride N = V·3.
 *
 * θ_i sums corner angles α between arms u = P_j − P_i, v = P_l − P_i over the
 * incident corners (apex i, consecutive link-neighbors j, l). The corner-angle
 * gradient is the standard discrete-geometry result (N̂ = unit u×v, the corner's
 * plane normal):
 *
 *   ∂α/∂P_j = −(N̂ × u)/|u|²,   ∂α/∂P_l = (N̂ × v)/|v|²,   ∂α/∂P_i = −(both).
 *
 * Each is ⊥ its arm, in the corner plane, magnitude 1/|arm|. δ_i = −θ_i + const,
 * so contributions accumulate with a leading minus. A link-neighbor is the `l` of
 * one corner and the `j` of the next; both contributions land in its slot.
 */
export function coneAngleJacobian(torus: Triangulation, positions: ArrayLike<number>, out: Float64Array): void {
  const N_COORDS = torus.vertexCount * 3;
  out.fill(0);
  for (let i = 0; i < torus.vertexCount; i++) {
    const link = torus.vertexLinks[i];
    const oi = 3 * i;
    const xi = positions[oi], yi = positions[oi + 1], zi = positions[oi + 2];
    const row = i * N_COORDS;
    for (let k = 0; k < link.length; k++) {
      const j = link[k];
      const l = link[(k + 1) % link.length];
      const oj = 3 * j, ol = 3 * l;
      const ux = positions[oj] - xi, uy = positions[oj + 1] - yi, uz = positions[oj + 2] - zi;
      const vx = positions[ol] - xi, vy = positions[ol + 1] - yi, vz = positions[ol + 2] - zi;

      // N̂ = unit(u × v).
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const nmag = Math.hypot(nx, ny, nz);
      if (nmag < 1e-300) continue;   // collinear arms: degenerate corner, skip
      const inv = 1 / nmag;
      nx *= inv; ny *= inv; nz *= inv;

      const u2 = ux * ux + uy * uy + uz * uz;
      const v2 = vx * vx + vy * vy + vz * vz;

      const gjx = -(ny * uz - nz * uy) / u2;
      const gjy = -(nz * ux - nx * uz) / u2;
      const gjz = -(nx * uy - ny * ux) / u2;
      const glx = (ny * vz - nz * vy) / v2;
      const gly = (nz * vx - nx * vz) / v2;
      const glz = (nx * vy - ny * vx) / v2;
      const gix = -(gjx + glx), giy = -(gjy + gly), giz = -(gjz + glz);

      // δ_i = −θ_i ⟹ subtract each corner-angle gradient.
      out[row + oi]     -= gix; out[row + oi + 1] -= giy; out[row + oi + 2] -= giz;
      out[row + oj]     -= gjx; out[row + oj + 1] -= gjy; out[row + oj + 2] -= gjz;
      out[row + ol]     -= glx; out[row + ol + 1] -= gly; out[row + ol + 2] -= glz;
    }
  }
}

/** The cone-deficit map as an `Fn` (dim V): value = the V deficits, jacobian = the analytic derivative. */
export function coneDeficit(torus: Triangulation): Fn {
  return {
    label: 'coneDeficit',
    dim: torus.vertexCount,
    value: (c, out) => { coneAngleDeficits(torus, c, out); },
    jacobian: (c, out) => { coneAngleJacobian(torus, c, out); },
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
export function flat(torus: Triangulation): Held {
  return { fn: coneDeficit(torus), drive: torus.vertexCount - 1 };
}
