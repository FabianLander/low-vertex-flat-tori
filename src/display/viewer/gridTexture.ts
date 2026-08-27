/**
 * Fundamental-domain grid textures, drawn on a canvas and tiled with
 * RepeatWrapping. Combined with the lattice UVs (`mesh/uv`, uv = M⁻¹·P) the square
 * buffer tiles as the torus's own parallelogram fundamental domain — seamless
 * across the cut, distortion-free.
 *
 *   latticeGridTexture — nested levels of graph-paper lines (major → fine), the
 *                        whole torus baked into one tile (use uvRepeat: 1).
 *   graphPaperTexture  — a uniform squares×squares minor grid + heavy tile-boundary
 *                        line (tile with an INTEGER .repeat to stay seamless).
 *
 * Impure render boundary (three.js + canvas).
 */

import * as THREE from 'three';
import type { Triangulation } from '@core/topology/triangulation.ts';
import { edgeKey } from '@core/topology/triangulation.ts';
import { latticeUV } from '@display/mesh/uv.ts';

export interface GridTextureOptions {
  size?: number;
  /** Subdivision counts, coarsest→finest. Each must divide the next. */
  levels?: number[];
  cellColor?: string;
  lineColor?: string;
  /** Coarsest line thickness, as a fraction of the whole tile. */
  majorWidth?: number;
  /** Thickness multiplier per finer level (<1 ⟹ progressively thinner). */
  widthFalloff?: number;
  /** Alpha multiplier per finer level (<1 ⟹ progressively lighter). */
  fadeFalloff?: number;
}

export function latticeGridTexture(opts: GridTextureOptions = {}): THREE.CanvasTexture {
  const size = opts.size ?? 1024;
  const levels = opts.levels ?? [6, 12, 24, 48];
  const cellColor = opts.cellColor ?? '#f4f1ea';
  const lineColor = opts.lineColor ?? '#1a1a1f';
  const majorWidth = opts.majorWidth ?? 0.012;
  const widthFalloff = opts.widthFalloff ?? 0.5;
  const fadeFalloff = opts.fadeFalloff ?? 0.55;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = cellColor;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = lineColor;

  // Finest → coarsest, so heavier coarse lines paint over lighter fine ones.
  for (let i = levels.length - 1; i >= 0; i--) {
    const div = levels[i];
    const factor = i > 0 ? div / levels[i - 1] : 0;
    const w = Math.max(1, majorWidth * size * widthFalloff ** i);
    ctx.globalAlpha = fadeFalloff ** i;
    for (let k = 0; k < div; k++) {
      if (factor && k % factor === 0) continue;
      drawGridLine(ctx, (k / div) * size, w, size);
    }
  }
  ctx.globalAlpha = 1;
  return wrapTexture(canvas);
}

export interface GraphPaperOptions {
  size?: number;
  squares?: number;        // minor squares per tile (= major-line period)
  bg?: string;
  minor?: string;
  major?: string;
  minorWidth?: number;     // fraction of tile
  majorWidth?: number;
}

export function graphPaperTexture(opts: GraphPaperOptions = {}): THREE.CanvasTexture {
  const size = opts.size ?? 1024;
  const squares = opts.squares ?? 5;
  const bg = opts.bg ?? '#fbfaf4';
  const minor = opts.minor ?? '#9fb4d4';
  const major = opts.major ?? '#5f82b4';
  const minorW = Math.max(1, (opts.minorWidth ?? 0.004) * size);
  const majorW = Math.max(1, (opts.majorWidth ?? 0.010) * size);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = minor;
  for (let i = 1; i < squares; i++) {
    const p = (i / squares) * size, h = minorW / 2;
    ctx.fillRect(p - h, 0, minorW, size);
    ctx.fillRect(0, p - h, size, minorW);
  }
  ctx.fillStyle = major;            // tile-boundary line (straddles ⟹ centered when tiled)
  const h = majorW / 2;
  ctx.fillRect(0, 0, h, size); ctx.fillRect(size - h, 0, h, size);
  ctx.fillRect(0, 0, size, h); ctx.fillRect(0, size - h, size, h);
  return wrapTexture(canvas);
}

function wrapTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** One horizontal + one vertical line centered at `p`; the seam line (p≈0) wraps. */
function drawGridLine(ctx: CanvasRenderingContext2D, p: number, w: number, size: number): void {
  const h = w / 2;
  if (p < h) {
    ctx.fillRect(0, 0, h, size);  ctx.fillRect(size - h, 0, h, size);
    ctx.fillRect(0, 0, size, h);  ctx.fillRect(0, size - h, size, h);
  } else {
    ctx.fillRect(p - h, 0, w, size);
    ctx.fillRect(0, p - h, size, w);
  }
}

/**
 * Graph paper with the triangulation's OWN EDGES baked into it — one ordinary texture, so it
 * survives the path tracer.
 *
 * Crease tubes are real geometry and trace fine, but they have a real radius, so on a folded
 * flat configuration a tube on the lower sheet pokes through the sheet above it. Painting the
 * edges into the surface shader fixes that but is an `onBeforeCompile` patch, which
 * `three-gpu-pathtracer` ignores — it reads material PROPERTIES, not your GLSL. A texture is
 * a property, so this route works everywhere.
 *
 * It works because of what the lattice UVs already are. `mesh/uv.latticeUV` sends each corner
 * to M⁻¹·P, its position in the DEVELOPED plane read in lattice coordinates, and developing is
 * an isometry that takes each edge to a straight segment — so the 1-skeleton is a set of
 * straight segments in UV space, and can simply be drawn. Λ maps to ℤ², so the picture is
 * periodic and tiles seamlessly; segments crossing the tile boundary are drawn again at the
 * eight neighbouring offsets so both sides agree.
 *
 * Use with `uvRepeat: 1` — the whole torus is one tile here, so the graph paper is subdivided
 * INSIDE the tile (`gridRepeat` major cells, each split `gridSubdivisions` ways) rather than by
 * repeating a small tile. The texture is specific to one realization's developed net, so it is
 * built per torus rather than shared.
 *
 * Impure render boundary (three.js + canvas).
 */
export interface LatticeEdgeTextureOptions extends GraphPaperOptions {
  /** Major graph-paper cells across the whole fundamental domain. Default 6. */
  gridRepeat?: number;
  /** Minor cells per major cell. Default 3. */
  gridSubdivisions?: number;
  /** Edge line color. Default near-black. */
  edgeColor?: string;
  /** Edge line width as a fraction of the tile. Default 0.006. */
  edgeWidth?: number;
  /** Draw the triangulation's edges at all. Default true; false leaves just the graph paper,
   *  which is what separates "the baked texture is wrong" from "the EDGE STROKES are wrong"
   *  when a surface traces black. */
  drawEdges?: boolean;
  /**
   * Per-edge stroke overrides, keyed by `edgeKey(u, v)` — e.g. one color per identified
   * boundary pair of an unfolding. `width` is a fraction of the tile (default: 2× the
   * plain `edgeWidth`); `dash` is an on/off pair, also tile fractions. Styled edges are
   * stroked AFTER the plain ones so they read on top. Because the map lives in lattice
   * coordinates, a styled edge appears at every placement of that edge — both boundary
   * copies of a developed net's cut edge, and the same edge on the folded torus — which
   * is exactly what marking a gluing wants. Baked, so it path-traces (a texture is a
   * material property; tube geometry for the same marks has blackened the trace).
   */
  edgeStyles?: ReadonlyMap<number, { color: string; width?: number; dash?: readonly [number, number] }>;
}

export function latticeEdgeTexture(
  triang: Triangulation,
  positions: ArrayLike<number>,
  opts: LatticeEdgeTextureOptions = {},
): THREE.CanvasTexture {
  const size = opts.size ?? 2048;
  const bg = opts.bg ?? '#fbfaf4';
  const minor = opts.minor ?? '#9fb4d4';
  const major = opts.major ?? '#5f82b4';
  const cells = opts.gridRepeat ?? 6;
  const subs = opts.gridSubdivisions ?? 3;
  const minorW = Math.max(1, (opts.minorWidth ?? 0.004) * size / cells);
  const majorW = Math.max(1, (opts.majorWidth ?? 0.010) * size / cells);
  const edgeColor = opts.edgeColor ?? '#241a10';
  const edgeW = Math.max(1, (opts.edgeWidth ?? 0.006) * size);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // graph paper: the fine grid first, then the heavier major lines over it
  const fine = cells * subs;
  ctx.fillStyle = minor;
  for (let i = 0; i < fine; i++) {
    if (i % subs === 0) continue;                     // that one is a major line
    const p = (i / fine) * size, h = minorW / 2;
    ctx.fillRect(p - h, 0, minorW, size);
    ctx.fillRect(0, p - h, size, minorW);
  }
  ctx.fillStyle = major;
  for (let i = 0; i < cells; i++) {
    const p = (i / cells) * size, h = majorW / 2;
    drawWrapped(ctx, p - h, 0, majorW, size, size);
    drawWrapped(ctx, 0, p - h, size, majorW, size);
  }

  if (opts.drawEdges === false) return wrapTexture(canvas);

  // the triangulation's edges, straight in lattice coordinates
  const uv = latticeUV(triang, positions, { repeat: 1 });
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const F = triang.triangles.length;
  // draw at the 3×3 block of lattice offsets so anything crossing the tile edge wraps
  const strokeWrapped = (a: number, b: number): void => {
    const x0 = uv[a] * size, y0 = (1 - uv[a + 1]) * size;   // UV origin bottom-left ⟹ v flips
    const x1 = uv[b] * size, y1 = (1 - uv[b + 1]) * size;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        ctx.beginPath();
        ctx.moveTo(x0 + dx * size, y0 + dy * size);
        ctx.lineTo(x1 + dx * size, y1 + dy * size);
        ctx.stroke();
      }
    }
  };
  const styled: { style: { color: string; width?: number; dash?: readonly [number, number] }; a: number; b: number }[] = [];
  ctx.strokeStyle = edgeColor;
  ctx.lineWidth = edgeW;
  for (let t = 0; t < F; t++) {
    const tri = triang.triangles[t];
    for (let k = 0; k < 3; k++) {
      let a = (t * 3 + k) * 2, b = (t * 3 + ((k + 1) % 3)) * 2;
      // the edge's two faces traverse it oppositely; stroke low→high vertex so a dash
      // pattern lands on the same texels both times instead of filling its own gaps
      if (tri[k] > tri[(k + 1) % 3]) [a, b] = [b, a];
      const style = opts.edgeStyles?.get(edgeKey(tri[k], tri[(k + 1) % 3]));
      if (style) { styled.push({ style, a, b }); continue; }   // over the plain ones, below
      strokeWrapped(a, b);
    }
  }
  for (const { style, a, b } of styled) {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = Math.max(1, (style.width ?? (opts.edgeWidth ?? 0.006) * 2) * size);
    ctx.setLineDash(style.dash ? [style.dash[0] * size, style.dash[1] * size] : []);
    strokeWrapped(a, b);
  }
  ctx.setLineDash([]);
  return wrapTexture(canvas);
}

/** A filled rect that also paints the part running off the tile back onto the other side. */
function drawWrapped(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, size: number): void {
  for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) ctx.fillRect(x + dx, y + dy, w, h);
}

/**
 * Re-back a canvas texture with a loaded IMAGE, keeping its wrapping and colour space.
 *
 * Why this exists: `three-gpu-pathtracer` packs every material texture into a 2D array by
 * re-rendering it, and measured on the `paper-folds` render a canvas-backed map comes out
 * BLACK in the trace while the same page's image-backed normal map traces correctly — the
 * WebGL preview shows both fine, so the fault only appears once you path trace. Encoding the
 * canvas to a PNG and loading it back gives an image-backed texture, which the tracer handles.
 *
 * The load is asynchronous, so the returned texture is initially empty; pass `onLoad` to
 * re-sync materials (`studio.notifyMaterialsChanged()`) when the pixels arrive.
 */
export function imageBackedTexture(
  source: THREE.CanvasTexture,
  onLoad?: () => void,
  label = 'texture',
): THREE.Texture {
  const canvas = source.image as HTMLCanvasElement;
  const url = canvas.toDataURL('image/png');
  // The encoded SIZE is the thing worth knowing when a map traces black: the tracer packs every
  // material texture into one array, so a map that is fine on its own can still be too much
  // together with the others.
  console.log(`[imageBackedTexture] ${label}: ${canvas.width}×${canvas.height}`
    + ` → ${(url.length / 1e6).toFixed(2)} MB of PNG data URL`);
  // A load that FAILS must say so. Silently, a failed decode leaves a texture with no image,
  // which reads downstream as a black surface — and hunting that from the far end costs hours.
  const tex = new THREE.TextureLoader().load(
    url,
    (t) => {
      const img = t.image as { width?: number; height?: number } | undefined;
      console.log(`[imageBackedTexture] ${label}: decoded ${img?.width}×${img?.height}`);
      onLoad?.();
    },
    undefined,
    (err) => console.error(`[imageBackedTexture] ${label}: LOAD FAILED — the map will be black`, err),
  );
  tex.wrapS = source.wrapS;
  tex.wrapT = source.wrapT;
  tex.colorSpace = source.colorSpace;
  tex.anisotropy = source.anisotropy;
  tex.repeat.copy(source.repeat);
  return tex;
}
