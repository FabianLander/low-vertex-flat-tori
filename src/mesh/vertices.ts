/**
 * Vertex geometry: one sphere per torus vertex, merged into a single
 * BufferGeometry. Real triangles (not InstancedMesh) so the path tracer sees
 * every sphere — StaticGeometryGenerator does not expand instances.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PaperTorus } from '../math/embedding';
import { outwardSign, vertexOutward } from './orient';

export interface VerticesOptions {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  /** Push spheres outward along the vertex normal so they sit proud of the faces. */
  offset?: number;
}

export function verticesGeometry(paper: PaperTorus, opts: VerticesOptions = {}): THREE.BufferGeometry {
  const radius = opts.radius ?? 0.05;
  const wSeg = opts.widthSegments ?? 16;
  const hSeg = opts.heightSegments ?? 12;
  const offset = opts.offset ?? 0;
  const p = paper.positions;
  const sign = offset !== 0 ? outwardSign(paper) : 1;
  const nrm: [number, number, number] = [0, 0, 0];

  const unit = new THREE.SphereGeometry(radius, wSeg, hSeg);
  const m = new THREE.Matrix4();

  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < paper.torus.vertexCount; i++) {
    let x = p[3 * i], y = p[3 * i + 1], z = p[3 * i + 2];
    if (offset !== 0) {
      vertexOutward(paper, i, sign, nrm);
      x += nrm[0] * offset; y += nrm[1] * offset; z += nrm[2] * offset;
    }
    m.makeTranslation(x, y, z);
    parts.push(unit.clone().applyMatrix4(m));
  }
  unit.dispose();

  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}
