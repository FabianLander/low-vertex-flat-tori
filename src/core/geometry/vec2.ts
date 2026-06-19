/**
 * `Vec2` — a point/vector in ℝ² as a plain 2-tuple `[x, y]`, with the 2D vector
 * algebra. The one ℝ² coordinate type for the whole codebase: the developed net and
 * harmonic layout in `topology/`, the modulus τ, certificates.
 *
 * Mirrors `vec3.ts`. Tuple ops allocate, so they're for cold code; the hot kernels
 * (`distance`, the `intersection` predicates) stay on raw scalar components and inline
 * these where needed.
 */

export type Vec2 = [number, number];

export const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const scale = (a: Vec2, k: number): Vec2 => [a[0] * k, a[1] * k];
export const dot = (a: Vec2, b: Vec2): number => a[0] * b[0] + a[1] * b[1];
export const len = (a: Vec2): number => Math.hypot(a[0], a[1]);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const dist2 = (a: Vec2, b: Vec2): number => {
  const dx = a[0] - b[0], dy = a[1] - b[1];
  return dx * dx + dy * dy;
};
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** The 2×2 determinant det[a; b] = aₓbᵧ − aᵧbₓ — the signed area of the parallelogram
 *  (a,b); >0 ⟺ b is CCW from a. (The "2D cross product"; signed-triangle-area and
 *  orientation tests are this on edge vectors.) */
export const det2 = (a: Vec2, b: Vec2): number => a[0] * b[1] - a[1] * b[0];
