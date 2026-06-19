/**
 * slicePlane — a decoration: a translucent plane quad + the live 3D section curve
 * where that plane cuts a realization, driven by `mesh/section`. Frame-agnostic:
 * `draw(positions, plane)` takes positions and a plane in the SAME frame (the caller
 * decides), so a world-fixed plane cutting a spinning torus just passes the torus's
 * world positions each frame. `loops()` exposes the measured cross-section.
 *
 * The curve is `LineSegments` with a preallocated buffer (≤ E segments) drawn on top
 * (depthTest off) — it's a diagnostic overlay, not part of the torus subject. Impure
 * render boundary (three.js).
 */

import * as THREE from 'three';
import type { Triangulation } from '@core/topology/triangulation.ts';
import { makeSection, type Loop } from '@display/mesh/section.ts';

const Z = new THREE.Vector3(0, 0, 1);

export interface SlicePlaneOptions {
  /** Draw the translucent plane quad of this size (omit / 0 ⟹ curve only). */
  planeSize?: number;
  planeColor?: THREE.ColorRepresentation;
  planeOpacity?: number;       // default 0.16
  curveColor?: THREE.ColorRepresentation;
}

export interface SlicePlane {
  readonly group: THREE.Group;
  /** Update the section curve (+ orient the plane quad) for this realization + plane. */
  draw(positions: ArrayLike<number>, plane: THREE.Plane): void;
  /** The last computed cross-section (ordered loops). */
  loops(): Loop[];
  dispose(): void;
}

export function slicePlane(triang: Triangulation, opts: SlicePlaneOptions = {}): SlicePlane {
  const section = makeSection(triang);
  const group = new THREE.Group();

  // optional plane quad
  let quad: THREE.Mesh | null = null;
  let quadMat: THREE.Material | null = null;
  if (opts.planeSize && opts.planeSize > 0) {
    quadMat = new THREE.MeshStandardMaterial({
      color: opts.planeColor ?? 0x4488ff, transparent: true, opacity: opts.planeOpacity ?? 0.16,
      side: THREE.DoubleSide, depthWrite: false,
    });
    quad = new THREE.Mesh(new THREE.PlaneGeometry(opts.planeSize, opts.planeSize), quadMat);
    group.add(quad);
  }

  // section curve: ≤ E segments ⟹ ≤ 2E vertices.
  const maxVerts = triang.edges.length * 2;
  const buf = new Float32Array(maxVerts * 3);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(buf, 3));
  const curveMat = new THREE.LineBasicMaterial({ color: opts.curveColor ?? 0x166534, depthTest: false, transparent: true });
  const curve = new THREE.LineSegments(geom, curveMat);
  curve.renderOrder = 10;
  curve.frustumCulled = false;
  group.add(curve);

  let last: Loop[] = [];

  function draw(positions: ArrayLike<number>, plane: THREE.Plane): void {
    last = section.loops(positions, plane);

    let n = 0;
    for (const loop of last) {
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i], b = loop[(i + 1) % loop.length];
        buf[n++] = a.x; buf[n++] = a.y; buf[n++] = a.z;
        buf[n++] = b.x; buf[n++] = b.y; buf[n++] = b.z;
      }
    }
    geom.setDrawRange(0, n / 3);
    geom.attributes.position.needsUpdate = true;
    geom.computeBoundingSphere();

    if (quad) {
      quad.position.copy(plane.normal).multiplyScalar(-plane.constant);
      quad.quaternion.setFromUnitVectors(Z, plane.normal);
    }
  }

  function loops(): Loop[] { return last; }

  function dispose(): void {
    geom.dispose();
    curveMat.dispose();
    if (quad) { quad.geometry.dispose(); quadMat?.dispose(); }
  }

  return { group, draw, loops, dispose };
}
