/**
 * faces — the 2-cells realized as a single non-indexed flat-shaded triangle mesh.
 * One geometry (not a Group): flat shading, per-face uv (the cut seam), and per-face
 * tint all require each triangle to own its 3 corners, so this part is genuinely one
 * mesh, not merged primitives.
 *
 * Factory over the triangulation: allocates the geometry once, then `draw(positions)`
 * streams a realization by rewriting position / normal (/ uv) attributes IN PLACE.
 * Coloring is the orthogonal channel `setColors`: per-face colors written across each
 * face's 3 corners read as a flat per-face tint, MULTIPLYING the material map (grid
 * paper that can redden toward a near-collision). The look color lives in `baseColor`.
 *
 * With `thickness > 0` the surface is SOLIDIFIED into a slab (outer skin kept exactly,
 * a second skin pushed inward along vertex normals with reversed winding). Layout
 * [outer | inner].
 *
 * A `Part` with domain 'face'. Impure render boundary (three.js). Real geometry ⇒
 * identical in WebGL + path tracer.
 */

import * as THREE from 'three';
import type { Triangulation } from '../topology/triangulation.ts';
import { splatFacePositions } from './splat.ts';
import { latticeUV } from './uv.ts';
import { outwardSign, vertexOutward } from './orient.ts';
import type { Vec3 } from '../geometry/vec3.ts';
import type { Part } from './part.ts';

export interface FacesOptions {
  /** Caller-owned material (must be `vertexColors: true` for `setColors` to show).
   *  If omitted, a default is created and OWNED here. */
  material?: THREE.Material;
  /** Base per-face color when unpainted. Default white (so it doesn't tint a map). */
  baseColor?: THREE.ColorRepresentation;
  /** Attach intrinsic lattice UVs (the fundamental-domain grid texture). */
  uv?: boolean;
  uvRepeat?: number;          // default 1
  /** Solidify into a slab of this thickness (0 = zero-thickness sheet). Fixed at build. */
  thickness?: number;
}

export function makeFaces(triang: Triangulation, opts: FacesOptions = {}): Part {
  const F = triang.triangles.length;
  const V = triang.vertexCount;
  const thickness = opts.thickness ?? 0;
  const skins = thickness > 0 ? 2 : 1;
  const cornerCount = F * 3 * skins;
  const useUV = opts.uv ?? false;
  const uvRepeat = opts.uvRepeat ?? 1;

  const base = new THREE.Color(opts.baseColor ?? 0xffffff);

  const position = new Float32Array(cornerCount * 3);
  const color = new Float32Array(cornerCount * 3);
  fillRGB(color, base);
  const uv = useUV ? new Float32Array(cornerCount * 2) : undefined;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
  if (uv) geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  const material = opts.material ?? new THREE.MeshStandardMaterial({
    vertexColors: true, flatShading: true, side: THREE.DoubleSide, roughness: 0.5, metalness: 0,
  });
  const mesh = new THREE.Mesh(geometry, material);

  // scratch
  const inner = thickness > 0 ? new Float64Array(V * 3) : null;
  const n: Vec3 = [0, 0, 0];

  function draw(positions: ArrayLike<number>, center: Vec3 | null = null): void {
    splatFacePositions(triang, positions, position.subarray(0, F * 9));

    if (thickness > 0 && inner) {
      const sign = outwardSign(triang, positions);
      for (let i = 0; i < V; i++) {
        vertexOutward(triang, positions, i, sign, n);
        inner[3 * i]     = positions[3 * i]     - thickness * n[0];
        inner[3 * i + 1] = positions[3 * i + 1] - thickness * n[1];
        inner[3 * i + 2] = positions[3 * i + 2] - thickness * n[2];
      }
      const innerBlock = position.subarray(F * 9, F * 18);
      splatFacePositions(triang, inner, innerBlock);
      reverseWinding(innerBlock, 3);   // flip so the inner skin faces the cavity
    }

    if (center) {
      const [cx, cy, cz] = center;
      for (let o = 0; o < position.length; o += 3) {
        position[o] -= cx; position[o + 1] -= cy; position[o + 2] -= cz;
      }
    }

    if (uv) {
      const outerUV = latticeUV(triang, positions, { repeat: uvRepeat });
      uv.set(outerUV, 0);
      if (thickness > 0) {
        const innerUV = outerUV.slice();
        reverseWinding(innerUV, 2);
        uv.set(innerUV, F * 6);
      }
      geometry.attributes.uv.needsUpdate = true;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();   // non-indexed ⟹ per-face (faceted)
    geometry.computeBoundingSphere();
  }

  function setColors(rgb: Float32Array | null): void {
    if (rgb === null) {
      fillRGB(color, base);
    } else {
      for (let t = 0; t < F; t++) {
        const r = rgb[3 * t], g = rgb[3 * t + 1], b = rgb[3 * t + 2];
        for (let s = 0; s < skins; s++) {
          const corner = (s * F + t) * 9;
          for (let k = 0; k < 3; k++) {
            color[corner + 3 * k] = r; color[corner + 3 * k + 1] = g; color[corner + 3 * k + 2] = b;
          }
        }
      }
    }
    geometry.attributes.color.needsUpdate = true;
  }

  function dispose(): void {
    geometry.dispose();
    if (!opts.material) material.dispose();   // dispose only our own default
  }

  return { object: mesh, domain: 'face', cellCount: F, draw, setColors, dispose };
}

function fillRGB(buf: Float32Array, c: THREE.Color): void {
  for (let i = 0; i < buf.length; i += 3) { buf[i] = c.r; buf[i + 1] = c.g; buf[i + 2] = c.b; }
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
