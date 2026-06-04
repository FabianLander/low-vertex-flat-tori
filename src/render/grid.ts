/**
 * Hierarchical fundamental-domain grid texture.
 *
 * Draws several nested levels of grid lines (like graph paper): a coarse major
 * grid, then progressively finer subdivisions, each thinner and lighter (lower
 * alpha) than the last. Combined with the lattice UVs (mesh/uv) and
 * RepeatWrapping, the square buffer tiles as the true parallelogram fundamental
 * domain of the torus's modulus — seamless across the cut, distortion-free.
 *
 * Because the whole flat torus IS one fundamental domain, the full hierarchy is
 * baked into one tile (use uvRepeat: 1): `levels[0]` lines span the torus.
 *
 * `levels` are subdivision counts coarse→fine; each MUST divide the next.
 */

import * as THREE from 'three';

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
    const factor = i > 0 ? div / levels[i - 1] : 0;   // lines at multiples of factor belong to a coarser level
    const w = Math.max(1, majorWidth * size * widthFalloff ** i);
    ctx.globalAlpha = fadeFalloff ** i;
    for (let k = 0; k < div; k++) {
      if (factor && k % factor === 0) continue;        // drawn by a coarser level already
      drawGridLine(ctx, (k / div) * size, w, size);
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Printed graph-paper texture: a uniform `squares × squares` minor grid per tile
 * with a heavier major line at the tile boundary. Tile it with an INTEGER
 * `.repeat` (so it stays seamless across the cut under the lattice UVs) ⟹ a
 * heavier line every `squares` minor squares, like an engineering pad.
 */
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
  const bg = opts.bg ?? '#fbfaf4';        // warm paper white
  const minor = opts.minor ?? '#9fb4d4';  // light blue minor lines
  const major = opts.major ?? '#5f82b4';  // darker blue major lines
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
    // straddle the tile boundary: half here, half wrapping from the far edge
    ctx.fillRect(0, 0, h, size);  ctx.fillRect(size - h, 0, h, size);
    ctx.fillRect(0, 0, size, h);  ctx.fillRect(0, size - h, size, h);
  } else {
    ctx.fillRect(p - h, 0, w, size);
    ctx.fillRect(0, p - h, size, w);
  }
}
