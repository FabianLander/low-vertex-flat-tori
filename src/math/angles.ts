/**
 * Cone-angle sums at each vertex of the 8-vertex flat torus.
 *
 * Pure functions on a flat positions array (length VERTEX_COUNT * 3,
 * layout [x0,y0,z0, x1,y1,z1, ...]; accepts Float64Array or Float32Array
 * since both satisfy ArrayLike<number>).
 *
 * The Newton solver consumes `coneAngleDeficits` as its 8-component residual
 * function. The viewer/demos consume the same functions for per-vertex
 * coloring. One implementation, two callers.
 */

import type { Torus } from '../tori/defineTorus';

const TWO_PI = Math.PI * 2;

export function coneAngleAt(torus: Torus, positions: ArrayLike<number>, i: number): number {
  const link = torus.vertexLinks[i];
  const oi = 3 * i;
  const xi = positions[oi];
  const yi = positions[oi + 1];
  const zi = positions[oi + 2];
  let total = 0;
  for (let k = 0; k < link.length; k++) {
    const j = link[k];
    const l = link[(k + 1) % link.length];
    const oj = 3 * j;
    const ol = 3 * l;
    const ex = positions[oj] - xi;
    const ey = positions[oj + 1] - yi;
    const ez = positions[oj + 2] - zi;
    const fx = positions[ol] - xi;
    const fy = positions[ol + 1] - yi;
    const fz = positions[ol + 2] - zi;
    const dot = ex * fx + ey * fy + ez * fz;
    const me = Math.hypot(ex, ey, ez);
    const mf = Math.hypot(fx, fy, fz);
    let cos = dot / (me * mf);
    if (cos > 1) cos = 1;
    else if (cos < -1) cos = -1;
    total += Math.acos(cos);
  }
  return total;
}

export function coneAngles(
  torus: Torus,
  positions: ArrayLike<number>,
  out?: Float64Array,
): Float64Array {
  const r = out ?? new Float64Array(torus.vertexCount);
  for (let i = 0; i < torus.vertexCount; i++) r[i] = coneAngleAt(torus, positions, i);
  return r;
}

/**
 * Per-vertex residual: 2π − coneAngle(i). Zero at every vertex iff the
 * embedding is flat. This is the Newton solver's R(x).
 */
export function coneAngleDeficits(
  torus: Torus,
  positions: ArrayLike<number>,
  out?: Float64Array,
): Float64Array {
  const r = out ?? new Float64Array(torus.vertexCount);
  for (let i = 0; i < torus.vertexCount; i++) r[i] = TWO_PI - coneAngleAt(torus, positions, i);
  return r;
}

export function maxConeDeficit(torus: Torus, positions: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < torus.vertexCount; i++) {
    const d = Math.abs(TWO_PI - coneAngleAt(torus, positions, i));
    if (d > m) m = d;
  }
  return m;
}

/**
 * Analytic Jacobian of the cone-angle DEFICITS R_i = 2π − θ_i.
 *
 * Writes out[i*N + c] = ∂R_i/∂x_c for every vertex i (0..7) and coordinate
 * c (0..23), row-major with stride N = 24. Exact derivative — the FD-free
 * alternative to differencing coneAngleDeficits. Validated row-by-row against
 * central finite differences (see angles.test.ts).
 *
 * θ_i = Σ over the incident corners (apex i, arms to consecutive link-neighbors
 * j, l) of the corner angle α between u = P_j − P_i and v = P_l − P_i. The
 * corner-angle gradient is the standard discrete-geometry result (N̂ = unit
 * u×v, the corner's plane normal):
 *
 *   ∂α/∂P_j = −(N̂ × u)/|u|²,   ∂α/∂P_l = (N̂ × v)/|v|²,   ∂α/∂P_i = −(both).
 *
 * Each is ⊥ its arm, in the corner plane, magnitude 1/|arm| (moving the far
 * end ⊥ by δ opens the angle by δ/|arm|). R_i = −θ_i, so contributions are
 * accumulated with a leading minus. A link-neighbor appears as the `l` of one
 * corner and the `j` of the next; both contributions accumulate into its slot.
 */
export function coneAngleJacobian(
  torus: Torus,
  positions: ArrayLike<number>,
  out: Float64Array,
): void {
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

      // N = u × v, then normalize.
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const nmag = Math.hypot(nx, ny, nz);
      if (nmag < 1e-300) continue;   // collinear arms: degenerate corner, skip
      const inv = 1 / nmag;
      nx *= inv; ny *= inv; nz *= inv;

      const u2 = ux * ux + uy * uy + uz * uz;
      const v2 = vx * vx + vy * vy + vz * vz;

      // ∂α/∂P_j = −(N̂ × u)/|u|²
      const gjx = -(ny * uz - nz * uy) / u2;
      const gjy = -(nz * ux - nx * uz) / u2;
      const gjz = -(nx * uy - ny * ux) / u2;
      // ∂α/∂P_l = (N̂ × v)/|v|²
      const glx = (ny * vz - nz * vy) / v2;
      const gly = (nz * vx - nx * vz) / v2;
      const glz = (nx * vy - ny * vx) / v2;
      // ∂α/∂P_i = −(∂α/∂P_j + ∂α/∂P_l)
      const gix = -(gjx + glx), giy = -(gjy + gly), giz = -(gjz + glz);

      // R_i = −θ_i ⟹ subtract each corner-angle gradient.
      out[row + oi]     -= gix; out[row + oi + 1] -= giy; out[row + oi + 2] -= giz;
      out[row + oj]     -= gjx; out[row + oj + 1] -= gjy; out[row + oj + 2] -= gjz;
      out[row + ol]     -= glx; out[row + ol + 1] -= gly; out[row + ol + 2] -= glz;
    }
  }
}
