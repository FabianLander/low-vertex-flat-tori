/**
 * vertices — the 0-cells realized as a `THREE.Group` of real sphere meshes (one
 * shared `SphereGeometry` per vertex). Real triangles (not `InstancedMesh`) so the
 * path tracer's BVH sees every sphere — and the BVH bakes each child's world matrix.
 *
 * Factory over the triangulation: `draw(positions)` sets each child's position
 * (optionally pushed `offset` along the vertex normal). The group/material/color/
 * dispose scaffolding (incl. Model A ownership) is shared with `edges` via
 * `instanceGroup`. Per-vertex color is what `paintVertices` drives (e.g. cone deficit).
 *
 * A `Part` with domain 'vertex'. Impure render boundary (three.js).
 */

import * as THREE from 'three';
import type { Triangulation } from '../topology/triangulation.ts';
import { outwardSign, vertexOutward } from './orient.ts';
import type { Vec3 } from '../geometry/vec3.ts';
import { instanceGroup } from './instanceGroup.ts';
import type { Part } from './part.ts';

export interface VerticesOptions {
  material?: THREE.Material;
  baseColor?: THREE.ColorRepresentation;
  radius?: number;            // default 0.05
  widthSegments?: number;     // default 16
  heightSegments?: number;    // default 12
  /** Push spheres outward along the vertex normal. Default 0. */
  offset?: number;
}

export function makeVertices(triang: Triangulation, opts: VerticesOptions = {}): Part {
  const radius = opts.radius ?? 0.05;
  const wSeg = opts.widthSegments ?? 16;
  const hSeg = opts.heightSegments ?? 12;
  const offset = opts.offset ?? 0;
  const V = triang.vertexCount;

  const geometry = new THREE.SphereGeometry(radius, wSeg, hSeg);
  const ig = instanceGroup({
    geometry, count: V,
    material: opts.material, makeDefault: () => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0 }),
    baseColor: opts.baseColor, fallbackColor: 0xe8e8ec,
  });

  const nrm: Vec3 = [0, 0, 0];

  function draw(positions: ArrayLike<number>, center: Vec3 | null = null): void {
    const sign = offset !== 0 ? outwardSign(triang, positions) : 1;
    const cx = center ? center[0] : 0, cy = center ? center[1] : 0, cz = center ? center[2] : 0;
    for (let i = 0; i < V; i++) {
      let x = positions[3 * i], y = positions[3 * i + 1], z = positions[3 * i + 2];
      if (offset !== 0) {
        vertexOutward(triang, positions, i, sign, nrm);
        x += nrm[0] * offset; y += nrm[1] * offset; z += nrm[2] * offset;
      }
      ig.children[i].position.set(x - cx, y - cy, z - cz);
    }
  }

  return { object: ig.group, domain: 'vertex', cellCount: V, draw, setColors: ig.setColors, dispose: ig.dispose };
}
