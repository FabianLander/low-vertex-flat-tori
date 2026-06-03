/**
 * Edge geometry: one cylindrical tube per torus edge, merged into a single
 * BufferGeometry. Real triangles (not LineSegments) so the path tracer's BVH
 * can see them — three-mesh-bvh's StaticGeometryGenerator only collects isMesh.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { edgeKey } from '../tori/defineTorus';
import type { PaperTorus } from '../math/embedding';
import { outwardSign, edgeOutward } from './orient';

const UP = new THREE.Vector3(0, 1, 0);

export interface EdgesOptions {
  radius?: number;
  radialSegments?: number;
  /** Push tubes outward along the local surface normal so they sit proud of the
   *  faces everywhere (not buried on concave regions). Defaults to `radius`. */
  offset?: number;
}

export function edgesGeometry(paper: PaperTorus, opts: EdgesOptions = {}): THREE.BufferGeometry {
  const radius = opts.radius ?? 0.02;
  const radialSegments = opts.radialSegments ?? 8;
  const offset = opts.offset ?? radius;
  const p = paper.positions;
  const sign = offset !== 0 ? outwardSign(paper) : 1;
  const nrm: [number, number, number] = [0, 0, 0];

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const m = new THREE.Matrix4();

  // Unit cylinder along +Y, height 1 centered at origin; transformed per edge.
  const unit = new THREE.CylinderGeometry(radius, radius, 1, radialSegments, 1, true);

  const parts: THREE.BufferGeometry[] = [];
  for (const [i, j] of paper.torus.edges) {
    a.set(p[3 * i], p[3 * i + 1], p[3 * i + 2]);
    b.set(p[3 * j], p[3 * j + 1], p[3 * j + 2]);
    if (offset !== 0) {
      const [t1, t2] = paper.torus.edgeToTris.get(edgeKey(i, j))!;
      edgeOutward(paper, t1, t2, sign, nrm);
      a.x += nrm[0] * offset; a.y += nrm[1] * offset; a.z += nrm[2] * offset;
      b.x += nrm[0] * offset; b.y += nrm[1] * offset; b.z += nrm[2] * offset;
    }
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
  unit.dispose();

  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}
