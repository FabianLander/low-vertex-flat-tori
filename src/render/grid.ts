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
