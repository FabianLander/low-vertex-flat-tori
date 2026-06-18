/**
 * Vec3 — a point/vector in ℝ³ as a plain 3-tuple `[x, y, z]`. The one extrinsic 3D
 * coordinate type, living at the bottom of the extrinsic stack (`geometry/`, the
 * torus-blind ℝ³ layer) so every layer above can share it — normals/poses/centers
 * in `mesh/`, the canonical pose in `configuration/gauge`, the reference coords in
 * `sampling/reference`. It is NOT in `topology/`, which is pure combinatorics (no
 * metric / 3D coords).
 *
 * Mutable, because its main use is as an allocation-light out-param buffer; pass a
 * `readonly Vec3[]` where the data is const. The kernels in `geometry/` themselves
 * stay on raw scalars (allocation-free); this is the tuple form for everyone else.
 */
export type Vec3 = [number, number, number];

// Tuple ops, mirroring `vec2.ts`. For COLD code (setup, gauge, normals) where the
// ergonomic tuple form pays for itself; the hot-path kernels (`distance`, the
// intersection predicates, `flat`'s Jacobian) stay on raw scalar components to
// avoid per-call allocation — see this module's header.
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Unit vector in a's direction; a zero vector returns itself (length floored to 1). */
export const normalize = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
