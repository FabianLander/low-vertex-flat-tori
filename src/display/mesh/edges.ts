/**
 * edges — the 1-cells realized as a `THREE.Group` of real cylinder meshes (one
 * shared `CylinderGeometry` per edge). Real triangles (not `LineSegments`) so the
 * path tracer's BVH sees them — and the BVH bakes each child's world matrix, so no
 * pre-merge is needed.
 *
 * Factory over the triangulation: `draw(positions)` sets each child's position /
 * orientation / length (rotate +Y onto the edge, scale to its length, translate to
 * its midpoint) — three.js does the transform. The group/material/color/dispose
 * scaffolding (incl. Model A ownership) is shared with `vertices` via `instanceGroup`;
 * tubes can be pushed `offset` along the surface normal to sit proud on concave folds.
 *
 * A `Part` with domain 'edge'. Impure render boundary (three.js).
 */

import * as THREE from 'three';
import type { Triangulation } from '@core/topology/triangulation.ts';
import { edgeKey } from '@core/topology/triangulation.ts';
import { outwardSign, edgeOutward } from './orient.ts';
import type { Vec3 } from '@core/geometry/vec3.ts';
import { instanceGroup } from './instanceGroup.ts';
import type { Part } from './part.ts';

const UP = new THREE.Vector3(0, 1, 0);

export interface EdgesOptions {
  material?: THREE.Material;
  baseColor?: THREE.ColorRepresentation;
  radius?: number;            // default 0.02
  radialSegments?: number;    // default 8
  /** Push tubes outward along the local surface normal. Default = radius. 0 ⟹ centered on the crease. */
  offset?: number;
}

export function makeEdges(triang: Triangulation, opts: EdgesOptions = {}): Part {
  const radius = opts.radius ?? 0.02;
  const radialSegments = opts.radialSegments ?? 8;
  const offset = opts.offset ?? radius;
  const E = triang.edges.length;
  const edgeTris = triang.edges.map(([i, j]) => triang.edgeToTris.get(edgeKey(i, j))!);

  const geometry = new THREE.CylinderGeometry(radius, radius, 1, radialSegments, 1, true);
  const ig = instanceGroup({
    geometry, count: E,
    material: opts.material, makeDefault: () => new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0 }),
    baseColor: opts.baseColor, fallbackColor: 0x1a1a1f,
  });

  // scratch
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  const dir = new THREE.Vector3(), mid = new THREE.Vector3();
  const nrm: Vec3 = [0, 0, 0];

  function draw(positions: ArrayLike<number>, center: Vec3 | null = null): void {
    const sign = offset !== 0 ? outwardSign(triang, positions) : 1;
    const cx = center ? center[0] : 0, cy = center ? center[1] : 0, cz = center ? center[2] : 0;
    for (let e = 0; e < E; e++) {
      const [i, j] = triang.edges[e];
      a.set(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
      b.set(positions[3 * j], positions[3 * j + 1], positions[3 * j + 2]);
      if (offset !== 0) {
        const [t1, t2] = edgeTris[e];
        edgeOutward(triang, positions, t1, t2, sign, nrm);
        a.x += nrm[0] * offset; a.y += nrm[1] * offset; a.z += nrm[2] * offset;
        b.x += nrm[0] * offset; b.y += nrm[1] * offset; b.z += nrm[2] * offset;
      }
      dir.subVectors(b, a);
      const len = dir.length() || 1e-9;
      dir.divideScalar(len);
      mid.addVectors(a, b).multiplyScalar(0.5);
      const child = ig.children[e];
      child.position.set(mid.x - cx, mid.y - cy, mid.z - cz);
      child.quaternion.setFromUnitVectors(UP, dir);
      child.scale.set(1, len, 1);
    }
  }

  return { object: ig.group, domain: 'edge', cellCount: E, draw, setColors: ig.setColors, dispose: ig.dispose };
}
