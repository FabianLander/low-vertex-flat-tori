/**
 * Outward-normal helpers — used to push the crease tubes / corner spheres slightly
 * proud of the face shell (so thin tubes aren't buried on concave saddle regions),
 * and to offset the inner skin when the surface is solidified into a slab.
 *
 * Works geometrically (so it reads identically in the WebGL preview and the path
 * tracer), unlike a raster polygonOffset. Pure functions on a bare positions array
 * (length 3·V, layout [x0,y0,z0, …]); the triangulation supplies the combinatorics.
 *
 * three.js only by neighbourhood (this is the impure render boundary), but in fact
 * allocation-light and three-free — kept here so the geometry builders share it.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { Vec3 } from '../geometry/vec3.ts';
import { triangleNormal, signedVolume6 } from '../geometry/triangle.ts';

/** Unit normal of triangle t, (b−a)×(c−a) normalized (orientation as authored). */
export function faceNormal(
  triang: Triangulation,
  p: ArrayLike<number>,
  t: number,
  out: Vec3,
): void {
  const [a, b, c] = triang.triangles[t];
  const oa = 3 * a, ob = 3 * b, oc = 3 * c;
  triangleNormal(
    p[oa], p[oa + 1], p[oa + 2],
    p[ob], p[ob + 1], p[ob + 2],
    p[oc], p[oc + 1], p[oc + 2],
    out,
  );
}

/**
 * +1 if the authored triangle winding makes (b−a)×(c−a) point OUTWARD, −1 if
 * inward. From the signed volume V = (1/6)Σ a·(b×c): V>0 ⟺ outward (right-hand).
 */
export function outwardSign(triang: Triangulation, p: ArrayLike<number>): number {
  let v6 = 0;
  for (const [a, b, c] of triang.triangles) {
    const oa = 3 * a, ob = 3 * b, oc = 3 * c;
    v6 += signedVolume6(
      p[oa], p[oa + 1], p[oa + 2],
      p[ob], p[ob + 1], p[ob + 2],
      p[oc], p[oc + 1], p[oc + 2],
    );
  }
  return v6 >= 0 ? 1 : -1;
}

/** Outward unit normal at edge (t1,t2): mean of the two incident face normals, oriented out. */
export function edgeOutward(
  triang: Triangulation,
  p: ArrayLike<number>,
  t1: number,
  t2: number,
  sign: number,
  out: Vec3,
): void {
  const a: Vec3 = [0, 0, 0];
  const b: Vec3 = [0, 0, 0];
  faceNormal(triang, p, t1, a);
  faceNormal(triang, p, t2, b);
  const nx = a[0] + b[0], ny = a[1] + b[1], nz = a[2] + b[2];
  const m = Math.hypot(nx, ny, nz) || 1;
  out[0] = (sign * nx) / m; out[1] = (sign * ny) / m; out[2] = (sign * nz) / m;
}

/** Outward unit normal at vertex i: mean of incident face normals, oriented out. */
export function vertexOutward(
  triang: Triangulation,
  p: ArrayLike<number>,
  i: number,
  sign: number,
  out: Vec3,
): void {
  const n: Vec3 = [0, 0, 0];
  let sx = 0, sy = 0, sz = 0;
  const tris = triang.triangles;
  for (let t = 0; t < tris.length; t++) {
    const [a, b, c] = tris[t];
    if (a === i || b === i || c === i) {
      faceNormal(triang, p, t, n);
      sx += n[0]; sy += n[1]; sz += n[2];
    }
  }
  const m = Math.hypot(sx, sy, sz) || 1;
  out[0] = (sign * sx) / m; out[1] = (sign * sy) / m; out[2] = (sign * sz) / m;
}
