/**
 * TorusView — the one subject. A factory closed over its triangulation that
 * assembles the chosen parts (faces · edges · vertices — the 2/1/0-cells) into a
 * `THREE.Group`; `draw(positions)` streams a realization, `paint{Vertices,Edges,
 * Faces}` color a cell-domain from a condition's scalar field.
 *
 *   const view = makeTorusView(triang, { surface: 'grid', corners: true });
 *   view.draw(positions);
 *   view.paintVertices(coneAngleDeficits(triang, positions), DEFICIT_PALETTE);
 *
 * The triangulation is fixed at construction because the parts' buffers are sized
 * by V/E/F; positions are the streaming input — the same currency as the search
 * interior. It is NOT a ConfigSpace and never `pull`s; it consumes already-realized
 * ℝ³ points. `PaperTorus` is the boundary envelope, destructured by `fromPaper`.
 *
 * The view is dumb about meaning: `paint*` take raw values + a palette, the demo
 * wires `condition → channel`. Material ownership is "creator disposes" (Model A):
 * the subject frees the materials IT builds; a caller-injected material stays the
 * caller's. Always REAL geometry ⇒ identical in WebGL + path tracer.
 */

import * as THREE from 'three';
import type { Triangulation } from '../topology/triangulation.ts';
import type { PaperTorus } from '../configuration/paperTorus.ts';
import type { Vec3 } from '../geometry/vec3.ts';
import type { Part, CellDomain } from '../mesh/part.ts';
import { makeFaces } from '../mesh/faces.ts';
import { makeEdges, type EdgesOptions } from '../mesh/edges.ts';
import { makeVertices } from '../mesh/vertices.ts';
import {
  plainSurfaceMaterial, gridSurfaceMaterial, creaseMaterial, vertexMaterial,
  SURFACE_GOLD, CREASE_DARK, VERTEX_WHITE,
} from './materials.ts';
import { colorsFromScalars, type ScalarPalette, DEFICIT_PALETTE } from './palette.ts';
import type { GridTextureOptions } from './gridTexture.ts';

export interface SurfaceConfig {
  style?: 'plain' | 'grid';            // default 'grid'
  material?: THREE.Material;           // caller-owned override
  color?: THREE.ColorRepresentation;   // base look color (the plain fill). default gold
  uvRepeat?: number;                   // default 1 (whole torus = one fundamental domain)
  thickness?: number;                  // solidify into a slab. default 0
  grid?: GridTextureOptions;
  roughness?: number;
}
export interface EdgesConfig { material?: THREE.Material; color?: THREE.ColorRepresentation; radius?: number; offset?: number; }
export interface VerticesConfig { material?: THREE.Material; color?: THREE.ColorRepresentation; radius?: number; offset?: number; }

export interface TorusViewOptions {
  /** Surface fill (the 2-cells). `true` ⟹ grid; pass a config for plain / overrides. Default true. */
  surface?: boolean | SurfaceConfig;
  /** Crease tubes along the edges (the 1-cells). Default false. */
  creases?: boolean | EdgesConfig;
  /** Spheres at the vertices (the 0-cells; what `paintVertices` colors). Default false. */
  corners?: boolean | VerticesConfig;
  /** Offset geometry so the group's local origin = the torus's bbox center
   *  (so group.rotation spins about the center). Default true. */
  center?: boolean;
}

export interface TorusView {
  readonly group: THREE.Group;
  /** Stream a realization (bare positions, length 3V). */
  draw(positions: ArrayLike<number>): void;
  /** Per-vertex coloring (e.g. cone deficit). null clears. Default palette: DEFICIT. */
  paintVertices(values: ArrayLike<number> | null, palette?: ScalarPalette): void;
  /** Per-edge coloring. null clears. */
  paintEdges(values: ArrayLike<number> | null, palette?: ScalarPalette): void;
  /** Per-face coloring (e.g. embedded margin). null clears. */
  paintFaces(values: ArrayLike<number> | null, palette?: ScalarPalette): void;
  /** Show/hide a part (e.g. toggle the creases). No-op if that part wasn't built. */
  setVisible(domain: CellDomain, visible: boolean): void;
  /** Rebuild the crease tubes at a new radius and redraw them. No-op without creases. */
  setCreaseRadius(radius: number): void;
  dispose(): void;
}

export function makeTorusView(triang: Triangulation, opts: TorusViewOptions = {}): TorusView {
  const group = new THREE.Group();
  const doCenter = opts.center ?? true;
  const parts = new Map<CellDomain, Part>();
  const owned: THREE.Material[] = [];   // Model A: materials the subject built, it frees
  const own = <T extends THREE.Material>(m: T): T => { owned.push(m); return m; };

  if (opts.surface ?? true) {
    const cfg: SurfaceConfig = opts.surface && opts.surface !== true ? opts.surface : {};
    const style = cfg.style ?? 'grid';
    const material = cfg.material
      ?? own(style === 'grid' ? gridSurfaceMaterial(cfg.grid, { roughness: cfg.roughness }) : plainSurfaceMaterial({ roughness: cfg.roughness }));
    addPart(makeFaces(triang, {
      material,
      baseColor: cfg.color ?? (style === 'grid' ? 0xffffff : SURFACE_GOLD),
      uv: style === 'grid',
      uvRepeat: cfg.uvRepeat ?? 1,
      thickness: cfg.thickness,
    }));
  }

  let edgeBuild: EdgesOptions | null = null;
  if (opts.creases) {
    const cfg: EdgesConfig = opts.creases === true ? {} : opts.creases;
    edgeBuild = { material: cfg.material ?? own(creaseMaterial()), baseColor: cfg.color ?? CREASE_DARK, radius: cfg.radius, offset: cfg.offset };
    addPart(makeEdges(triang, edgeBuild));
  }

  if (opts.corners) {
    const cfg: VerticesConfig = opts.corners === true ? {} : opts.corners;
    addPart(makeVertices(triang, {
      material: cfg.material ?? own(vertexMaterial()),
      baseColor: cfg.color ?? VERTEX_WHITE, radius: cfg.radius, offset: cfg.offset,
    }));
  }

  function addPart(part: Part): void { parts.set(part.domain, part); group.add(part.object); }

  let lastPositions: ArrayLike<number> | null = null;
  function draw(positions: ArrayLike<number>): void {
    lastPositions = positions;
    const c = doCenter ? bboxCenter(triang, positions) : null;
    for (const part of parts.values()) part.draw(positions, c);
  }

  function paint(domain: CellDomain, values: ArrayLike<number> | null, palette: ScalarPalette): void {
    const part = parts.get(domain);
    if (!part) return;
    if (values !== null && values.length !== part.cellCount) {
      throw new Error(`paint ${domain}: expected ${part.cellCount} values, got ${values.length}`);
    }
    part.setColors(values === null ? null : colorsFromScalars(values, palette));
  }

  return {
    group,
    draw,
    paintVertices: (v, p = DEFICIT_PALETTE) => paint('vertex', v, p),
    paintEdges: (v, p = DEFICIT_PALETTE) => paint('edge', v, p),
    paintFaces: (v, p = DEFICIT_PALETTE) => paint('face', v, p),
    setVisible(domain, visible) { const part = parts.get(domain); if (part) part.object.visible = visible; },
    setCreaseRadius(radius) {
      if (!edgeBuild) return;
      const old = parts.get('edge');
      const visible = old ? old.object.visible : true;
      if (old) { group.remove(old.object); old.dispose(); }
      edgeBuild = { ...edgeBuild, radius };
      const part = makeEdges(triang, edgeBuild);
      part.object.visible = visible;
      parts.set('edge', part);
      group.add(part.object);
      if (lastPositions) part.draw(lastPositions, doCenter ? bboxCenter(triang, lastPositions) : null);
    },
    dispose() {
      for (const part of parts.values()) part.dispose();
      owned.forEach((m) => m.dispose());
    },
  };
}

/** Build a view from the boundary envelope and draw it once. */
export function fromPaper(paper: PaperTorus, opts: TorusViewOptions = {}): TorusView {
  const view = makeTorusView(paper.triang, opts);
  view.draw(paper.positions);
  return view;
}

/** Bounding-box center of the V vertex positions. */
function bboxCenter(triang: Triangulation, p: ArrayLike<number>): Vec3 {
  let lox = Infinity, loy = Infinity, loz = Infinity, hix = -Infinity, hiy = -Infinity, hiz = -Infinity;
  for (let i = 0; i < triang.vertexCount; i++) {
    const x = p[3 * i], y = p[3 * i + 1], z = p[3 * i + 2];
    if (x < lox) lox = x; if (x > hix) hix = x;
    if (y < loy) loy = y; if (y > hiy) hiy = y;
    if (z < loz) loz = z; if (z > hiz) hiz = z;
  }
  return [(lox + hix) / 2, (loy + hiy) / 2, (loz + hiz) / 2];
}
