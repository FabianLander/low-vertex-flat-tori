/**
 * modulusCell — the reduced lattice cell Λ of a realization, as a parallelogram in
 * the xy-plane (outline tubes + a faint fill), centered on the origin in unit-area
 * developing-plane units. For a rectangular torus (Re τ̂ = 0) it's the rectangle
 * (1/√Im)×(√Im); for a rhombic one (|Re τ̂| = ½) it's the matching parallelogram —
 * so the same decoration serves both galleries.
 *
 * The cell uses the REDUCED modulus τ̂ = reduceModulus(τ): a unit-area lattice with
 * v₁ = (1/√Im, 0), v₂ = (Re/√Im, √Im) (so |v₁×v₂| = 1). The caller scales/places it
 * to share the developed net's display scale.
 *
 * A decoration, factory over the triangulation; `draw(positions)` rebuilds the cell.
 * Materials are owned per Model A (created here ⟹ freed here; injected ⟹ caller's).
 * Impure render boundary (three.js).
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Triangulation } from '@core/topology/triangulation.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { reduceModulus } from '@core/moduli/reduce.ts';

const UP = new THREE.Vector3(0, 1, 0);

export interface ModulusCellOptions {
  lineMaterial?: THREE.Material;
  fillMaterial?: THREE.Material;
  lineColor?: THREE.ColorRepresentation;   // default blue
  fillColor?: THREE.ColorRepresentation;
  fillOpacity?: number;                     // default 0.07
  lineRadius?: number;                      // default 0.006 (in unit-area cell units)
}

export interface ModulusCell {
  readonly group: THREE.Group;
  draw(positions: ArrayLike<number>): void;
  dispose(): void;
}

export function modulusCell(triang: Triangulation, opts: ModulusCellOptions = {}): ModulusCell {
  const radius = opts.lineRadius ?? 0.006;
  const lineMat = opts.lineMaterial ?? new THREE.MeshBasicMaterial({ color: opts.lineColor ?? 0x2435af });
  const fillMat = opts.fillMaterial ?? new THREE.MeshBasicMaterial({
    color: opts.fillColor ?? opts.lineColor ?? 0x2435af,
    transparent: true, opacity: opts.fillOpacity ?? 0.07, side: THREE.DoubleSide,
  });
  const ownLine = !opts.lineMaterial, ownFill = !opts.fillMaterial;

  const group = new THREE.Group();
  let outline: THREE.Mesh | null = null;
  let fill: THREE.Mesh | null = null;

  function clear(): void {
    if (outline) { group.remove(outline); outline.geometry.dispose(); outline = null; }
    if (fill) { group.remove(fill); fill.geometry.dispose(); fill = null; }
  }

  function draw(positions: ArrayLike<number>): void {
    clear();
    const tau = reduceModulus(modulus(triang, positions).tau);
    const im = Math.max(tau[1], 1e-9), re = tau[0];
    const a = 1 / Math.sqrt(im);
    const v1: [number, number] = [a, 0];
    const v2: [number, number] = [re * a, im * a];   // = [Re/√Im, √Im]
    const cx = (v1[0] + v2[0]) / 2, cy = (v1[1] + v2[1]) / 2;   // center the cell
    const C: [number, number][] = [
      [-cx, -cy], [v1[0] - cx, v1[1] - cy], [v1[0] + v2[0] - cx, v1[1] + v2[1] - cy], [v2[0] - cx, v2[1] - cy],
    ];

    // outline: a tube along each of the 4 edges
    const tubes: THREE.BufferGeometry[] = [];
    const unit = new THREE.CylinderGeometry(radius, radius, 1, 12, 1, false);
    const A = new THREE.Vector3(), B = new THREE.Vector3(), dir = new THREE.Vector3();
    const mid = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), m = new THREE.Matrix4();
    for (let k = 0; k < 4; k++) {
      const P = C[k], Q = C[(k + 1) % 4];
      A.set(P[0], P[1], 0); B.set(Q[0], Q[1], 0);
      dir.subVectors(B, A);
      const len = dir.length() || 1e-9;
      dir.divideScalar(len);
      q.setFromUnitVectors(UP, dir);
      mid.addVectors(A, B).multiplyScalar(0.5);
      sc.set(1, len + 2 * radius, 1);
      m.compose(mid, q, sc);
      tubes.push(unit.clone().applyMatrix4(m));
    }
    unit.dispose();
    const og = mergeGeometriesSafe(tubes);
    outline = new THREE.Mesh(og, lineMat);
    group.add(outline);

    // fill: the parallelogram as two triangles
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      C[0][0], C[0][1], 0, C[1][0], C[1][1], 0, C[2][0], C[2][1], 0,
      C[0][0], C[0][1], 0, C[2][0], C[2][1], 0, C[3][0], C[3][1], 0,
    ]), 3));
    fg.computeVertexNormals();
    fill = new THREE.Mesh(fg, fillMat);
    group.add(fill);
  }

  function dispose(): void {
    clear();
    if (ownLine) lineMat.dispose();
    if (ownFill) fillMat.dispose();
  }

  return { group, draw, dispose };
}

function mergeGeometriesSafe(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}
