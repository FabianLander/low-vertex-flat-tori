/**
 * Minimal 2D vector helpers for the plane-geometry utilities (curve fitting and
 * point-cloud sampling). Self-contained — structurally compatible with the
 * `V2 = readonly [number, number]` used in develop.ts, but kept independent so
 * the plane code carries no torus dependency.
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

/**
 * Foot of the perpendicular from `p` to the segment [a,b], clamped to the
 * segment. Returns the clamped parameter `t ∈ [0,1]`, the foot point, and the
 * squared distance. A degenerate (zero-length) segment measures to `a`.
 * (2D analogue of distance.ts `pointSegmentDist2`, but it also returns t/foot.)
 */
export function projectToSegment(p: Vec2, a: Vec2, b: Vec2): { t: number; foot: Vec2; dist2: number } {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const ab2 = abx * abx + aby * aby;
  let t = ab2 < 1e-30 ? 0 : ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / ab2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const foot: Vec2 = [a[0] + t * abx, a[1] + t * aby];
  const dx = p[0] - foot[0], dy = p[1] - foot[1];
  return { t, foot, dist2: dx * dx + dy * dy };
}
