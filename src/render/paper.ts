/**
 * The shared "paper" look for the flat-torus renders: a face material (graph-paper
 * grid or plain, with an optional paper-grain normal map) plus a matching crease
 * material. Every birthday demo builds its surface through here so the paper stays
 * identical across the orbit grid, the path-traced grid, and the single-subject view.
 *
 * Each demo still declares its own palette/knobs in CONFIG and passes them in — this
 * is a shared building block, not a global theme.
 */

import * as THREE from 'three';
import { graphPaperTexture } from './grid';
import { creaseEdgeMaterial } from './styledTorus';
import { loadNormalMap } from './textures';

export interface PaperOptions {
  /** Paper (background) color — also the default crease/edge color. */
  paperColor: string;
  /** Graph-paper line colors (only used when surface === 'grid'). */
  gridColor: string;
  gridMinorColor: string;
  /** 'grid' = graph-paper texture · 'plain' = flat paper color. Default 'grid'. */
  surface?: 'grid' | 'plain';
  roughness?: number;          // 0 glossy … 1 matte. Default 0.92.
  gridRepeat?: number;         // major blocks across the torus. Default 6.
  gridSubdivisions?: number;   // fine squares per major block. Default 3.
  gridMinorWidth?: number;     // default 0.004
  gridMajorWidth?: number;     // default 0.012
  /** Crease/edge tube color. Default = paperColor. */
  edgeColor?: THREE.ColorRepresentation;
  /** Paper-grain normal map in assets/textures (omit for none). */
  normalMapFile?: string;
  normalRepeat?: number;       // default 4
  normalScale?: number;        // default 1
}

/**
 * Build the paper face + crease materials. `onNormalLoad` fires once the normal map
 * arrives — pass `studio.notifyMaterialsChanged` in path-traced demos so the trace
 * re-syncs (omit it for plain WebGL, where the render loop picks the texture up).
 */
export function paperMaterials(
  opts: PaperOptions,
  onNormalLoad?: () => void,
): { face: THREE.MeshStandardMaterial; edge: THREE.MeshStandardMaterial } {
  const base = { roughness: opts.roughness ?? 0.92, metalness: 0, flatShading: true, side: THREE.DoubleSide } as const;

  let face: THREE.MeshStandardMaterial;
  if ((opts.surface ?? 'grid') === 'grid') {
    const tex = graphPaperTexture({
      bg: opts.paperColor, minor: opts.gridMinorColor, major: opts.gridColor,
      squares: opts.gridSubdivisions ?? 3,
      minorWidth: opts.gridMinorWidth ?? 0.004, majorWidth: opts.gridMajorWidth ?? 0.012,
    });
    const rep = opts.gridRepeat ?? 6;
    tex.repeat.set(rep, rep);
    face = new THREE.MeshStandardMaterial({ map: tex, ...base });
  } else {
    face = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.paperColor), ...base });
  }

  const edge = creaseEdgeMaterial(opts.edgeColor ?? opts.paperColor);

  if (opts.normalMapFile) {
    const nrm = loadNormalMap(opts.normalMapFile, { repeat: opts.normalRepeat ?? 4 }, onNormalLoad);
    if (nrm) {
      face.normalMap = nrm;
      const s = opts.normalScale ?? 1;
      face.normalScale.set(s, s);
      face.needsUpdate = true;
    }
  }

  return { face, edge };
}
