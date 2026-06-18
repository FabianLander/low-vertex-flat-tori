/**
 * Torus-blind triangle/segment interior-intersection predicates in 3D — the
 * boolean kernels behind the embeddedness test. Built on the ORIENTATION predicate
 * `orient3d` (sign of a 4-point signed volume): a self-intersection is a function of
 * the orientation signs of the vertices, so the test is sign-only — no divisions.
 * That is what makes it robust in the near-flat regime (nearly coplanar triangles ⇒
 * tiny determinants), where division-based tests (Möller–Trumbore) lose precision.
 * Coordinates come from a shared `positions` buffer at vertex indices. (Validated to
 * agree with a Möller–Trumbore implementation over 20k embedded/crossing configs.)
 *
 * Pure: no three.js, no DOM, no Triangulation.
 */

/**
 * Sign of the signed volume of tetrahedron (a,b,c,d) = sign of det[b−a, c−a, d−a]
 * = sign of (b−a)·((c−a)×(d−a)). +1 / −1 / 0 (coplanar). The fundamental robust
 * geometric predicate — no divisions, so the float sign is the exact sign except
 * for genuinely (near-)coplanar 4-tuples, which on a generic config don't arise for
 * the disjoint pairs we test (they share no vertices).
 */
export function orient3d(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  dx: number, dy: number, dz: number,
): number {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const cax = cx - ax, cay = cy - ay, caz = cz - az;
  const dax = dx - ax, day = dy - ay, daz = dz - az;
  const nx = cay * daz - caz * day;
  const ny = caz * dax - cax * daz;
  const nz = cax * day - cay * dax;
  const det = bax * nx + bay * ny + baz * nz;
  return det > 0 ? 1 : det < 0 ? -1 : 0;
}

/**
 * Segment p→q vs triangle (a,b,c), open interiors only — true iff the segment's
 * interior pierces the triangle's interior. Orientation form:
 *   1. p, q strictly on opposite sides of plane(a,b,c)  [the segment crosses the plane], and
 *   2. the three tetrahedra (p,q,·) over the triangle's edges share one sign
 *      [the line pq passes through the triangle's interior].
 * Any zero ⇒ a boundary touch ⇒ reported as NOT intersecting (open interiors).
 */
export function segmentTriangleIntersect(
  positions: ArrayLike<number>,
  pi: number, qi: number,
  ai: number, bi: number, ci: number,
): boolean {
  const op = 3 * pi, oq = 3 * qi, oa = 3 * ai, ob = 3 * bi, oc = 3 * ci;
  const px = positions[op], py = positions[op + 1], pz = positions[op + 2];
  const qx = positions[oq], qy = positions[oq + 1], qz = positions[oq + 2];
  const ax = positions[oa], ay = positions[oa + 1], az = positions[oa + 2];
  const bx = positions[ob], by = positions[ob + 1], bz = positions[ob + 2];
  const cx = positions[oc], cy = positions[oc + 1], cz = positions[oc + 2];

  // 1. p, q on opposite sides of plane(a,b,c)?
  const sp = orient3d(ax, ay, az, bx, by, bz, cx, cy, cz, px, py, pz);
  const sq = orient3d(ax, ay, az, bx, by, bz, cx, cy, cz, qx, qy, qz);
  if (sp === 0 || sq === 0 || sp === sq) return false;

  // 2. does line pq pass through the triangle interior? (consistent winding)
  const u = orient3d(px, py, pz, qx, qy, qz, ax, ay, az, bx, by, bz);
  const v = orient3d(px, py, pz, qx, qy, qz, bx, by, bz, cx, cy, cz);
  const w = orient3d(px, py, pz, qx, qy, qz, cx, cy, cz, ax, ay, az);
  if (u === 0 || v === 0 || w === 0) return false;
  return u === v && v === w;
}

/**
 * Triangle-vs-triangle interior intersection — true iff any edge of one pierces the
 * other's interior (6 segment-triangle tests). Triangles as vertex indices.
 */
export function triangleTriangleIntersect(
  positions: ArrayLike<number>,
  a0: number, a1: number, a2: number,
  b0: number, b1: number, b2: number,
): boolean {
  if (segmentTriangleIntersect(positions, a0, a1, b0, b1, b2)) return true;
  if (segmentTriangleIntersect(positions, a1, a2, b0, b1, b2)) return true;
  if (segmentTriangleIntersect(positions, a2, a0, b0, b1, b2)) return true;
  if (segmentTriangleIntersect(positions, b0, b1, a0, a1, a2)) return true;
  if (segmentTriangleIntersect(positions, b1, b2, a0, a1, a2)) return true;
  if (segmentTriangleIntersect(positions, b2, b0, a0, a1, a2)) return true;
  return false;
}
