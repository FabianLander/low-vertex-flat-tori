/**
 * Materials for the torus parts — the injected "look", separate from the geometry
 * (`mesh/`). Two coloring mechanisms, by part:
 *
 *   • surface — `vertexColors: true` with a white base, so per-face paint MULTIPLIES
 *     the map (grid paper that can redden toward a near-collision). The look color
 *     (gold for plain) lives in the surface part's `baseColor`, not here.
 *   • creases / corners — plain materials; the part clones one per cell and tints
 *     `material.color` directly, so they carry no vertex colors.
 *
 * Plain `MeshStandardMaterial`s throughout ⟹ identical in the WebGL preview and the
 * path tracer. Impure render boundary (three.js).
 */

import * as THREE from 'three';
import { latticeGridTexture, graphPaperTexture, type GridTextureOptions, type GraphPaperOptions } from './gridTexture.ts';
import { loadNormalMap } from './normalMap.ts';

/** Default look colors (the surface/crease/vertex base tints the parts apply). */
export const SURFACE_GOLD = 0xb8902a;
export const CREASE_DARK = 0x1a1a1f;
export const VERTEX_WHITE = 0xe8e8ec;

export interface SurfaceMaterialOptions {
  roughness?: number;
  metalness?: number;
}

/** Plain flat-shaded surface material (white base; the gold lives in the part's baseColor). */
export function plainSurfaceMaterial(opts: SurfaceMaterialOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true, color: 0xffffff, flatShading: true, side: THREE.DoubleSide,
    roughness: opts.roughness ?? 0.55, metalness: opts.metalness ?? 0,
  });
}

/** Lattice-grid surface material — the texture tiles as the torus's fundamental domain
 *  under the lattice UVs (use the surface with `uv: true, uvRepeat: 1`). */
export function gridSurfaceMaterial(
  grid: GridTextureOptions = {},
  opts: SurfaceMaterialOptions = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: latticeGridTexture(grid),
    vertexColors: true, flatShading: true, side: THREE.DoubleSide,
    roughness: opts.roughness ?? 0.6, metalness: opts.metalness ?? 0,
  });
}

/** Plain crease/vertex material (the part tints `color` per cell). */
export function creaseMaterial(opts: SurfaceMaterialOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ roughness: opts.roughness ?? 0.5, metalness: opts.metalness ?? 0 });
}

export const vertexMaterial = creaseMaterial;

// ─── the "paper" look for the renders (graph paper + optional grain normal map) ───

export interface PaperOptions {
  paperColor: string;
  gridColor: string;
  gridMinorColor: string;
  surface?: 'grid' | 'plain';
  roughness?: number;
  gridRepeat?: number;
  gridSubdivisions?: number;
  gridMinorWidth?: number;
  gridMajorWidth?: number;
  edgeColor?: THREE.ColorRepresentation;
  normalMapFile?: string;
  normalRepeat?: number;
  normalScale?: number;
}

/**
 * The shared "paper" face + crease materials (graph paper, optional grain normal
 * map). `onNormalLoad` fires once the normal map decodes — pass
 * `studio.notifyMaterialsChanged` in path-traced demos so the trace re-syncs.
 */
export function paperMaterials(
  opts: PaperOptions,
  onNormalLoad?: () => void,
): { surface: THREE.MeshStandardMaterial; crease: THREE.MeshStandardMaterial } {
  const base = { vertexColors: true, roughness: opts.roughness ?? 0.92, metalness: 0, flatShading: true, side: THREE.DoubleSide } as const;

  let surface: THREE.MeshStandardMaterial;
  if ((opts.surface ?? 'grid') === 'grid') {
    const tex = graphPaperTexture({
      bg: opts.paperColor, minor: opts.gridMinorColor, major: opts.gridColor,
      squares: opts.gridSubdivisions ?? 3,
      minorWidth: opts.gridMinorWidth ?? 0.004, majorWidth: opts.gridMajorWidth ?? 0.012,
    } satisfies GraphPaperOptions);
    const rep = opts.gridRepeat ?? 6;
    tex.repeat.set(rep, rep);
    surface = new THREE.MeshStandardMaterial({ map: tex, ...base });
  } else {
    surface = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.paperColor), ...base });
  }

  const crease = new THREE.MeshStandardMaterial({ color: opts.edgeColor ?? opts.paperColor, roughness: 0.5, metalness: 0 });

  if (opts.normalMapFile) {
    const nrm = loadNormalMap(opts.normalMapFile, { repeat: opts.normalRepeat ?? 4 }, onNormalLoad);
    if (nrm) {
      surface.normalMap = nrm;
      const s = opts.normalScale ?? 1;
      surface.normalScale.set(s, s);
      surface.needsUpdate = true;
    }
  }

  return { surface, crease };
}
