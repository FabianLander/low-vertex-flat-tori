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
