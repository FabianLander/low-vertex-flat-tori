/**
 * developedSheet — a flat torus, unrolled into the plane: the very sheet of paper
 * it folds from. `developNet` lays the triangulation flat with its true intrinsic
 * edge lengths; we express the planar corners in LATTICE coordinates (uv = M⁻¹·P,
 * the same map mesh/uv uses) so the identical graph-paper texture tiles across it.
 * Thin tube "fold lines" run along every triangle edge.
 *
 * Key detail: we unfold with the LATTICE-CONSISTENT attachment
 * (latticeLayout.developAttach), not the default combinatorial spanning tree.
 * That fans the triangles around a vertex into a compact, near-convex whole (the
 * fundamental-domain hexagon) instead of a jagged tree — and we derive the UVs
 * from that SAME net so texture and geometry always agree.
 *
 * Returns a THREE.Group (flat faces in z=0 + fold-line tubes), centered on the
 * origin so it can swap in place with the folded TorusMesh.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PaperTorus } from '../math/embedding';
import type { V2 } from '../math/develop';
import { developNet, modulus } from '../math/develop';
import { latticeLayout } from '../math/latticeLayout';

export interface DevelopedSheetOptions {
  faceMaterial: THREE.Material;
  /** Omit to draw no fold lines. */
  edgeMaterial?: THREE.Material;
  edgeRadius?: number;
  /** Grid cells per fundamental domain — match the torus's uvRepeat. */
  uvRepeat?: number;
}

const UP = new THREE.Vector3(0, 1, 0);

export function developedSheet(paper: PaperTorus, opts: DevelopedSheetOptions): THREE.Group {
  const torus = paper.torus;
  // unfold with the lattice-consistent gluing → compact, near-convex net
  const attach = latticeLayout(torus).developAttach(torus.developOrder);
  const net = developNet(torus, paper.positions, attach);
  const F = torus.triangles.length;

  // M⁻¹ maps planar net points → lattice coords (seamless grid), as in mesh/uv.
  const { v1, v2 } = modulus(torus, paper.positions);
  const det = v1[0] * v2[1] - v1[1] * v2[0];
  if (Math.abs(det) < 1e-12) throw new Error('developedSheet: degenerate lattice basis');
  const inv = 1 / det;
  const m00 = v2[1] * inv, m01 = -v2[0] * inv, m10 = -v1[1] * inv, m11 = v1[0] * inv;
  const repeat = opts.uvRepeat ?? 1;

  // ---- flat face mesh: net corners at z=0, with matching lattice UVs ----
  const pos = new Float32Array(F * 3 * 3);
  const uv = new Float32Array(F * 3 * 2);
  for (let t = 0; t < F; t++) {
    for (let k = 0; k < 3; k++) {
      const [x, y] = net.corners[t][k];
      const o3 = (t * 3 + k) * 3, o2 = (t * 3 + k) * 2;
      pos[o3] = x; pos[o3 + 1] = y; pos[o3 + 2] = 0;
      uv[o2] = (m00 * x + m01 * y) * repeat;
      uv[o2 + 1] = (m10 * x + m11 * y) * repeat;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();

  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, opts.faceMaterial));

  // ---- fold lines: one tube per unique edge of the developed net ----
  if (opts.edgeMaterial) {
    const tubes = foldLineTubes(net.corners, opts.edgeRadius ?? 0.004);
    if (tubes) group.add(new THREE.Mesh(tubes, opts.edgeMaterial));
  }

  // center on the origin (so it occupies the same spot as the folded torus)
  const c = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
  group.children.forEach((ch) => ch.position.sub(c));
  return group;
}

/** Merged cylinder tubes along every distinct edge of the planar net (coincident
 *  internal edges drawn once; the two halves of a cut edge stay separate). */
function foldLineTubes(corners: V2[][], radius: number): THREE.BufferGeometry | null {
  const unit = new THREE.CylinderGeometry(radius, radius, 1, 8, 1, true);
  const parts: THREE.BufferGeometry[] = [];
  const seen = new Set<string>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
  const mid = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3(), m = new THREE.Matrix4();
  const r = (p: V2) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`;

  for (const tri of corners) {
    for (let k = 0; k < 3; k++) {
      const P = tri[k], Q = tri[(k + 1) % 3];
      const key = r(P) < r(Q) ? `${r(P)}|${r(Q)}` : `${r(Q)}|${r(P)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      a.set(P[0], P[1], 0); b.set(Q[0], Q[1], 0);
      dir.subVectors(b, a);
      const len = dir.length();
      if (len < 1e-9) continue;
      dir.divideScalar(len);
      quat.setFromUnitVectors(UP, dir);
      mid.addVectors(a, b).multiplyScalar(0.5);
      scale.set(1, len, 1);
      m.compose(mid, quat, scale);
      parts.push(unit.clone().applyMatrix4(m));
    }
  }
  unit.dispose();
  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}
