/**
 * Outward-normal helpers for offsetting the edge/vertex wireframe slightly proud
 * of the face shell — so thin tubes/spheres aren't buried on concave (saddle)
 * regions of the surface. Works geometrically (both renderers), unlike raster
 * polygonOffset.
 */

import type { PaperTorus } from '../math/embedding';

/** Unit normal of triangle t, as (b−a)×(c−a) normalized (orientation as authored). */
function faceNormal(paper: PaperTorus, t: number, out: [number, number, number]): void {
  const p = paper.positions;
  const [a, b, c] = paper.torus.triangles[t];
  const oa = 3 * a, ob = 3 * b, oc = 3 * c;
  const ux = p[ob] - p[oa], uy = p[ob + 1] - p[oa + 1], uz = p[ob + 2] - p[oa + 2];
  const vx = p[oc] - p[oa], vy = p[oc + 1] - p[oa + 1], vz = p[oc + 2] - p[oa + 2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const m = Math.hypot(nx, ny, nz) || 1;
  out[0] = nx / m; out[1] = ny / m; out[2] = nz / m;
}

/**
 * +1 if the authored triangle winding makes (b−a)×(c−a) point OUTWARD, −1 if
 * inward. From the signed volume V = (1/6)Σ a·(b×c): V>0 ⟺ outward (right-hand).
 */
export function outwardSign(paper: PaperTorus): number {
  const p = paper.positions;
  let v6 = 0;
  for (const [a, b, c] of paper.torus.triangles) {
    const oa = 3 * a, ob = 3 * b, oc = 3 * c;
    const ax = p[oa], ay = p[oa + 1], az = p[oa + 2];
    const bx = p[ob], by = p[ob + 1], bz = p[ob + 2];
    const cx = p[oc], cy = p[oc + 1], cz = p[oc + 2];
    // a · (b × c)
    v6 += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return v6 >= 0 ? 1 : -1;
}

/** Outward unit normal at edge (i,j): mean of its two incident face normals, oriented outward. */
export function edgeOutward(paper: PaperTorus, t1: number, t2: number, sign: number, out: [number, number, number]): void {
  const a: [number, number, number] = [0, 0, 0];
  const b: [number, number, number] = [0, 0, 0];
  faceNormal(paper, t1, a);
  faceNormal(paper, t2, b);
  let nx = a[0] + b[0], ny = a[1] + b[1], nz = a[2] + b[2];
  const m = Math.hypot(nx, ny, nz) || 1;
  out[0] = (sign * nx) / m; out[1] = (sign * ny) / m; out[2] = (sign * nz) / m;
}

/** Outward unit normal at vertex i: mean of incident face normals, oriented outward. */
export function vertexOutward(paper: PaperTorus, i: number, sign: number, out: [number, number, number]): void {
  const n: [number, number, number] = [0, 0, 0];
  let sx = 0, sy = 0, sz = 0;
  const tris = paper.torus.triangles;
  for (let t = 0; t < tris.length; t++) {
    const [a, b, c] = tris[t];
    if (a === i || b === i || c === i) {
      faceNormal(paper, t, n);
      sx += n[0]; sy += n[1]; sz += n[2];
    }
  }
  const m = Math.hypot(sx, sy, sz) || 1;
  out[0] = (sign * sx) / m; out[1] = (sign * sy) / m; out[2] = (sign * sz) / m;
}
