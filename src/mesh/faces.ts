/**
 * Face geometry for a PaperTorus: a non-indexed, flat-shaded triangle mesh,
 * optionally carrying the intrinsic lattice UVs (see mesh/uv).
 *
 * With `thickness > 0` the surface is SOLIDIFIED into a thin slab: the original
 * surface is kept exactly (outer skin, grid intact) and a second skin is offset
 * INWARD along vertex normals with reversed winding, so together they bound a
 * watertight solid. Inward-only means the visible side never moves; the only
 * failure mode is the inner skin self-intersecting where the tube pinches
 * thinner than `thickness` — which is why thickness is meant to be tuned by eye.
 *
 * Renderer-agnostic: a non-indexed flat-shaded triangle mesh for any PaperTorus.
 */

import * as THREE from 'three';
import type { PaperTorus } from '../math/embedding';
import { splatFacePositions } from './splat';
import { latticeUV } from './uv';
import { outwardSign, vertexOutward } from './orient';

export interface FacesOptions {
  center?: boolean;
  /** Attach intrinsic lattice UVs (for the fundamental-domain grid texture). */
  uv?: boolean;
  /** UV repeat: subdivides each fundamental domain into repeat×repeat cells. */
  uvRepeat?: number;
  /** Solidify into a slab of this thickness (0 = zero-thickness sheet). */
  thickness?: number;
}

export function facesGeometry(paper: PaperTorus, opts: FacesOptions = {}): THREE.BufferGeometry {
  const torus = paper.torus;
  const thickness = opts.thickness ?? 0;

  let position = splatFacePositions(torus, paper.positions);
  let uv = opts.uv ? latticeUV(torus, paper.positions, { repeat: opts.uvRepeat }) : undefined;

  if (thickness > 0) {
    // Inner skin: every vertex pushed inward along its outward normal.
    const sign = outwardSign(paper);
    const inner = new Float64Array(paper.positions.length);
    const n: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < torus.vertexCount; i++) {
      vertexOutward(paper, i, sign, n);
      inner[3 * i]     = paper.positions[3 * i]     - thickness * n[0];
      inner[3 * i + 1] = paper.positions[3 * i + 1] - thickness * n[1];
      inner[3 * i + 2] = paper.positions[3 * i + 2] - thickness * n[2];
    }
    const posInner = splatFacePositions(torus, inner);
    reverseWinding(posInner, 3); // flip so the inner skin faces the cavity
    position = concat(position, posInner);
    if (uv) {
      const uvInner = uv.slice();
      reverseWinding(uvInner, 2);
      uv = concat(uv, uvInner);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (opts.center) g.center();
  g.computeVertexNormals(); // non-indexed ⟹ per-face normals ⟹ faceted look
  g.computeBoundingSphere();
  return g;
}

/** Swap corners 1 and 2 of every triangle (each corner = `itemSize` floats). */
function reverseWinding(buf: Float32Array, itemSize: number): void {
  const stride = 3 * itemSize;
  for (let o = 0; o < buf.length; o += stride) {
    for (let k = 0; k < itemSize; k++) {
      const i1 = o + itemSize + k, i2 = o + 2 * itemSize + k;
      const tmp = buf[i1]; buf[i1] = buf[i2]; buf[i2] = tmp;
    }
  }
}

function concat(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
