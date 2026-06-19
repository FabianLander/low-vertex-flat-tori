/**
 * Per-simplex kernels — properties of a single triangle (and its corners) in ℝ²/ℝ³.
 * Torus-blind: every routine takes raw scalar coordinates (allocation-free, the
 * hot-path tier — same style as `distance.ts`), so the caller that owns a
 * `Triangulation` reads the three corners out of its buffer and passes them here.
 * The triangle→vertex lookup, and any sum over a vertex link / cell list, stays in
 * the layer above (`constraints/flat`, `mesh/orient`, `moduli/develop`, …).
 *
 * Pure: no three.js, no DOM, no Triangulation.
 */

import type { Vec3 } from './vec3.ts';

// ─── angles ──────────────────────────────────────────────────────────────────

/** Corner angle α at apex `a` of triangle (a,b,c): the angle between arms b−a and
 *  c−a, in [0, π]. (The cone angle at a mesh vertex is the sum of these over its
 *  incident corners.) */
export function cornerAngle(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  const dot = ux * vx + uy * vy + uz * vz;
  const mu = Math.hypot(ux, uy, uz), mv = Math.hypot(vx, vy, vz);
  let cos = dot / (mu * mv);
  if (cos > 1) cos = 1; else if (cos < -1) cos = -1;
  return Math.acos(cos);
}

/**
 * Gradient of the corner angle α at apex `a` of triangle (a,b,c) — arms u = b−a,
 * v = c−a — w.r.t. each of the three vertices, written into `ga`,`gb`,`gc`. Returns
 * false (outs untouched) for a degenerate/collinear corner (zero area), where the
 * gradient is undefined; the caller skips such a corner. The standard discrete-DG
 * result (N̂ = unit(u×v) is the corner's plane normal):
 *   ∂α/∂b = −(N̂ × u)/|u|²,  ∂α/∂c = (N̂ × v)/|v|²,  ∂α/∂a = −(∂α/∂b + ∂α/∂c).
 * Each is ⊥ its arm, in the corner plane, magnitude 1/|arm|.
 */
export function cornerAngleGrad(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  ga: Vec3, gb: Vec3, gc: Vec3,
): boolean {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const nmag = Math.hypot(nx, ny, nz);
  if (nmag < 1e-300) return false;            // collinear arms: degenerate corner
  const inv = 1 / nmag; nx *= inv; ny *= inv; nz *= inv;
  const u2 = ux * ux + uy * uy + uz * uz;
  const v2 = vx * vx + vy * vy + vz * vz;
  gb[0] = -(ny * uz - nz * uy) / u2; gb[1] = -(nz * ux - nx * uz) / u2; gb[2] = -(nx * uy - ny * ux) / u2;
  gc[0] =  (ny * vz - nz * vy) / v2; gc[1] =  (nz * vx - nx * vz) / v2; gc[2] =  (nx * vy - ny * vx) / v2;
  ga[0] = -(gb[0] + gc[0]);          ga[1] = -(gb[1] + gc[1]);          ga[2] = -(gb[2] + gc[2]);
  return true;
}

// ─── area / normal / signed area ─────────────────────────────────────────────

/** Unit normal of triangle (a,b,c): (b−a)×(c−a) normalized (orientation by the
 *  given winding). A degenerate triangle yields a zero vector. Writes into `out`. */
export function triangleNormal(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  out: Vec3,
): void {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const m = Math.hypot(nx, ny, nz) || 1;
  out[0] = nx / m; out[1] = ny / m; out[2] = nz / m;
}

/** Area of triangle (a,b,c) in ℝ³: ½‖(b−a)×(c−a)‖. */
export function triangleArea(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const ux = bx - ax, uy = by - ay, uz = bz - az;
  const vx = cx - ax, vy = cy - ay, vz = cz - az;
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  return 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
}

/** Twice the signed area of triangle (a,b,c) in the plane = (b−a)×(c−a); >0 ⟺ CCW.
 *  The scalar form of `vec2.det2` on the edge vectors (for hot callers reading a buffer). */
export function signedArea2(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}
