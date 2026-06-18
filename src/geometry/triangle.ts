/**
 * Per-simplex kernels — properties of a single triangle (and its corners) in ℝ²/ℝ³.
 * Torus-blind: every routine takes raw scalar coordinates (allocation-free, the
 * hot-path tier — same style as `distance.ts`), so the caller that owns a
 * `Triangulation` reads the three corners out of its buffer and passes them here.
 * The triangle→vertex lookup, and any sum over a vertex link / cell list, stays in
 * the layer above (`constraints/flat`, `mesh/orient`, `topology/develop`, …).
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

// ─── area / normal / orientation ─────────────────────────────────────────────

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
 *  (Scalar/component form of `vec2.signedArea2`, for callers reading a buffer.) */
export function triangleSignedArea2(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** Scalar triple product a·(b×c) = 6× the signed volume of tetra (origin,a,b,c).
 *  Summed over a closed mesh's triangles it gives 6× the enclosed signed volume
 *  (its sign is the outward/inward orientation of the authored winding). */
export function signedVolume6(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  return ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
}

// ─── plane cut ───────────────────────────────────────────────────────────────

const EPS = 1e-12;

/**
 * Ratio (smaller piece area / triangle area) ∈ [0, 0.5] of triangle (a,b,c) cut by
 * the plane through `(rx,ry,rz)` with normal `(nx,ny,nz)` (the normal need not be
 * unit — the ratio is scale-invariant in it). Zero if the plane doesn't divide the
 * triangle. Both "two vertices on one side" and "one vertex on the plane" reduce to
 * min(t₁·t₂, 1 − t₁·t₂) on the cut parameters.
 */
export function planeCutRatio(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  nx: number, ny: number, nz: number,
  rx: number, ry: number, rz: number,
): number {
  const d0 = (ax - rx) * nx + (ay - ry) * ny + (az - rz) * nz;
  const d1 = (bx - rx) * nx + (by - ry) * ny + (bz - rz) * nz;
  const d2 = (cx - rx) * nx + (cy - ry) * ny + (cz - rz) * nz;
  if (d0 > EPS && d1 > EPS && d2 > EPS) return 0;
  if (d0 < -EPS && d1 < -EPS && d2 < -EPS) return 0;

  const s0 = d0 < -EPS ? -1 : 1, s1 = d1 < -EPS ? -1 : 1, s2 = d2 < -EPS ? -1 : 1;
  const numPos = (s0 > 0 ? 1 : 0) + (s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0);
  if (numPos === 0 || numPos === 3) return 0;

  const singleIsPos = numPos === 1;
  let dS: number, dO1: number, dO2: number;
  if ((s0 > 0) === singleIsPos)      { dS = d0; dO1 = d1; dO2 = d2; }
  else if ((s1 > 0) === singleIsPos) { dS = d1; dO1 = d2; dO2 = d0; }
  else                                { dS = d2; dO1 = d0; dO2 = d1; }

  const denom1 = dS - dO1, denom2 = dS - dO2;
  if (Math.abs(denom1) < EPS || Math.abs(denom2) < EPS) return 0;
  let prod = (dS / denom1) * (dS / denom2);
  if (prod < 0) prod = 0; else if (prod > 1) prod = 1;
  return Math.min(prod, 1 - prod);
}
