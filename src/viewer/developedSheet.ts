/**
 * developedSheet — the flat torus unrolled into the plane: the sheet of paper it
 * folds from. `developNet` lays the triangulation flat at its true intrinsic edge
 * lengths; the planar corners are expressed in LATTICE coordinates (uv = M⁻¹·P, the
 * same map `mesh/uv` uses) so the identical grid texture tiles across it. Thin tube
 * "fold lines" run along every triangle edge.
 *
 * A decoration (sits beside the folded `TorusView`), factory over the triangulation:
 * `draw(positions)` (re)builds the net for that realization. The net geometry lives
 * here — it's used only by this decoration — rather than a separate `mesh/net`.
 * Faces lie in z=0, centered on the origin so it can swap in place with the torus.
 *
 * Materials are caller-owned (Model A): the decoration disposes only its own geometry.
 * Impure render boundary (three.js).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Triangulation } from '../topology/triangulation.ts';
import type { V2 } from '../topology/develop.ts';
import { developNet } from '../topology/develop.ts';
import { latticeUV } from '../mesh/uv.ts';

const UP = new THREE.Vector3(0, 1, 0);

export interface DevelopedSheetOptions {
  faceMaterial: THREE.Material;
  /** Omit to draw no fold lines. */
  foldMaterial?: THREE.Material;
  foldRadius?: number;          // default 0.004
  /** Grid cells per fundamental domain — match the torus's uvRepeat. Default 1. */
  uvRepeat?: number;
}

export interface DevelopedSheet {
  readonly group: THREE.Group;
  draw(positions: ArrayLike<number>): void;
  dispose(): void;
}

export function developedSheet(triang: Triangulation, opts: DevelopedSheetOptions): DevelopedSheet {
  const F = triang.triangles.length;
  const group = new THREE.Group();
  let faceMesh: THREE.Mesh | null = null;
  let foldMesh: THREE.Mesh | null = null;

  function clear(): void {
    if (faceMesh) { group.remove(faceMesh); faceMesh.geometry.dispose(); faceMesh = null; }
    if (foldMesh) { group.remove(foldMesh); foldMesh.geometry.dispose(); foldMesh = null; }
  }

  function draw(positions: ArrayLike<number>): void {
    clear();
    const net = developNet(triang, positions);

    // flat faces at z=0 with the torus's lattice UVs (from THIS net, so they agree)
    const uv = latticeUV(triang, positions, { repeat: opts.uvRepeat ?? 1, net });
    const pos = new Float32Array(F * 3 * 3);
    for (let t = 0; t < F; t++) {
      for (let k = 0; k < 3; k++) {
        const [x, y] = net.corners[t][k];
        const o3 = (t * 3 + k) * 3;
        pos[o3] = x; pos[o3 + 1] = y; pos[o3 + 2] = 0;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // white vertex colors so a `vertexColors` paper material multiplies through to its
    // map (without a color attribute, vertexColors renders black).
    const col = new Float32Array(F * 3 * 3); col.fill(1);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    faceMesh = new THREE.Mesh(geo, opts.faceMaterial);
    group.add(faceMesh);

    // fold lines: one tube per unique edge of the planar net
    if (opts.foldMaterial) {
      const tubes = foldLineTubes(net.corners, opts.foldRadius ?? 0.004);
      if (tubes) { foldMesh = new THREE.Mesh(tubes, opts.foldMaterial); group.add(foldMesh); }
    }

    // center on the origin (occupy the same spot as the folded torus)
    const c = new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3());
    group.children.forEach((ch) => ch.position.sub(c));
  }

  function dispose(): void { clear(); }

  return { group, draw, dispose };
}

/** Merged cylinder tubes along every distinct edge of the planar net (coincident
 *  internal edges drawn once; the two halves of a cut edge stay separate). */
function foldLineTubes(corners: V2[][], radius: number): THREE.BufferGeometry | null {
  const unit = new THREE.CylinderGeometry(radius, radius, 1, 8, 1, true);
  const parts: THREE.BufferGeometry[] = [];
  const seen = new Set<string>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
  const mid = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3(), m = new THREE.Matrix4();
  const r = (p: V2): string => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`;

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
