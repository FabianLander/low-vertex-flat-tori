/**
 * Composable presentation styles for a flat torus, on top of mesh/TorusMesh.
 *
 * Three variants the renders care about, all one-liners over `styledTorus`:
 *   • { surface: 'plain', edges: true }  — plain surface + thin crease cylinders
 *   • { surface: 'grid' }                — grid-textured surface, no cylinders
 *   • { surface: 'grid', edges: true }   — both
 *
 * Works for ANY PaperTorus / modulus: the grid UV is computed per-torus
 * (developNet/modulus), so the texture tiles as that torus's own fundamental
 * parallelogram. Materials are simple MeshStandardMaterials so everything
 * renders identically in the WebGL preview and the path tracer.
 */

import * as THREE from 'three';
import type { PaperTorus } from '../math/embedding';
import { TorusMesh } from '../mesh/TorusMesh';
import { latticeGridTexture, type GridTextureOptions } from './grid';

export function gridFaceMaterial(grid: GridTextureOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: latticeGridTexture(grid),
    roughness: 0.6, metalness: 0.0,
    flatShading: true, side: THREE.DoubleSide,
  });
}

export function plainFaceMaterial(color = 0xb8902a): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.6, metalness: 0.0,
    flatShading: true, side: THREE.DoubleSide,
  });
}

export function creaseEdgeMaterial(color = 0x3a2210): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
}

export interface StyledTorusOptions {
  /** Surface fill: a plain color or the lattice grid. Default 'grid'. */
  surface?: 'plain' | 'grid';
  /** Add thin crease cylinders along the triangle edges. Default false. */
  edges?: boolean;
  /** Override the face material outright (e.g. a custom texture). */
  faceMaterial?: THREE.Material;
  /** Override the edge material. */
  edgeMaterial?: THREE.Material;
  /** Grid params when surface === 'grid'. */
  grid?: GridTextureOptions;
  /** Crease cylinder radius (kept ≪ the surface self-gap so it doesn't punch through). */
  edgeRadius?: number;
}

export function styledTorus(paper: PaperTorus, opts: StyledTorusOptions = {}): TorusMesh {
  const surface = opts.surface ?? 'grid';
  const edges = opts.edges ?? false;
  const faceMaterial = opts.faceMaterial
    ?? (surface === 'grid' ? gridFaceMaterial(opts.grid) : plainFaceMaterial());
  return new TorusMesh(paper, {
    faces: true,
    edges,
    vertices: false,
    uv: surface === 'grid',
    uvRepeat: 1,                              // whole torus = one fundamental domain
    faceMaterial,
    edgeMaterial: edges ? (opts.edgeMaterial ?? creaseEdgeMaterial()) : undefined,
    edgeRadius: opts.edgeRadius ?? 0.005,
    edgeOffset: 0,                            // centered on the crease
  });
}
