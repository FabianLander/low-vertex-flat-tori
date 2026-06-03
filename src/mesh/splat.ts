/**
 * The one triangle-splat primitive: copy a PaperTorus's V vertex positions into
 * a non-indexed (16 tris × 3 corners) Float32Array, in `torus.triangles` order.
 *
 * Non-indexed means each triangle owns its 3 corners — which is what lets us
 * (a) flat-shade via computeVertexNormals and (b) give a vertex DIFFERENT uvs in
 * different incident triangles (essential for the developed-net UVs, where a
 * single vertex lands at different planar points per face / across the cut).
 *
 * Both viewer/TorusView and mesh/faces consume this, so the splat lives once.
 */

import type { Torus } from '../tori/defineTorus';

/** Face corner positions, length = triangles.length * 9. */
export function splatFacePositions(
  torus: Torus,
  positions: ArrayLike<number>,
  out?: Float32Array,
): Float32Array {
  const tris = torus.triangles;
  const buf = out ?? new Float32Array(tris.length * 9);
  for (let t = 0; t < tris.length; t++) {
    const [a, b, c] = tris[t];
    const o = t * 9, oa = 3 * a, ob = 3 * b, oc = 3 * c;
    buf[o]     = positions[oa];     buf[o + 1] = positions[oa + 1]; buf[o + 2] = positions[oa + 2];
    buf[o + 3] = positions[ob];     buf[o + 4] = positions[ob + 1]; buf[o + 5] = positions[ob + 2];
    buf[o + 6] = positions[oc];     buf[o + 7] = positions[oc + 1]; buf[o + 8] = positions[oc + 2];
  }
  return buf;
}
