/**
 * Combinatorial figures for the 8-vertex flat-torus triangulation. One script,
 * three SVGs (each also written to docs/ and rendered to PDF via headless Chrome):
 *
 *   1. universal-cover.svg    — the periodic triangular-lattice tiling, cropped
 *                               around one fundamental domain (gold parallelogram).
 *   2. fundamental-domain.svg — a single hexagonal fundamental domain, vertex 0
 *                               on the left boundary.
 *   3. generators.svg         — the same hexagon with the two H1 generator loops
 *                               (develop.ts GENERATOR_LOOPS) as colored edge-paths.
 *
 * The abstract triangular-lattice layout lives in src/math/latticeLayout.ts.
 *
 * Usage:  npx tsx scripts/draw-figures.mjs
 */

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

import { GENERATOR_LOOPS } from '../src/math/develop.ts';
import {
  PERIOD_BASIS, planeOf, periodicTiles, hexDomain, vertexLabels, tracePath,
} from '../src/math/latticeLayout.ts';

// ── SVG rendering ─────────────────────────────────────────────────────────────
function renderFigure(name, { tiles, polylines = [], polygons = [], caption, labelTriangles = true }) {
  const vlabels = vertexLabels(tiles);
  const allPts = [...tiles.flatMap((t) => t.P), ...vlabels.map((v) => v.pos),
    ...polylines.flatMap((pl) => pl.pts), ...polygons.flatMap((pg) => pg.pts)];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of allPts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const PAD = 40, S = 120;
  const w = (maxX - minX) * S + 2 * PAD, h = (maxY - minY) * S + 2 * PAD + 22;
  const X = (x) => PAD + (x - minX) * S;
  const Y = (y) => h - PAD - (y - minY) * S;
  const sc = ([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`;

  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" font-family="system-ui, sans-serif">`];
  svg.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
  for (const { id, P, cen } of tiles) {
    svg.push(`<polygon points="${P.map(sc).join(' ')}" fill="#eef1f7" stroke="#8b94a8" stroke-width="1.4"/>`);
    if (labelTriangles) svg.push(`<text x="${X(cen[0]).toFixed(1)}" y="${Y(cen[1]).toFixed(1)}" font-size="18" font-weight="700" fill="#16324f" text-anchor="middle" dominant-baseline="central">${id}</text>`);
  }
  for (const pg of polygons) svg.push(`<polygon points="${pg.pts.map(sc).join(' ')}" fill="none" stroke="${pg.stroke}" stroke-width="3.5" stroke-dasharray="9 6"/>`);
  for (const pl of polylines) {
    svg.push(`<polyline points="${pl.pts.map(sc).join(' ')}" fill="none" stroke="${pl.color}" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    const a = pl.pts[pl.pts.length - 2], b = pl.pts[pl.pts.length - 1];
    const ax = X(a[0]), ay = Y(a[1]), bx = X(b[0]), by = Y(b[1]);
    const ang = Math.atan2(by - ay, bx - ax), hh = 14;
    svg.push(`<path d="M ${bx.toFixed(1)} ${by.toFixed(1)} L ${(bx - hh * Math.cos(ang - 0.4)).toFixed(1)} ${(by - hh * Math.sin(ang - 0.4)).toFixed(1)} L ${(bx - hh * Math.cos(ang + 0.4)).toFixed(1)} ${(by - hh * Math.sin(ang + 0.4)).toFixed(1)} Z" fill="${pl.color}"/>`);
  }
  for (const { pos, id } of vlabels) {
    const z = id === 0;
    svg.push(`<circle cx="${X(pos[0]).toFixed(1)}" cy="${Y(pos[1]).toFixed(1)}" r="${z ? 15 : 13}" fill="${z ? '#111' : '#c0392b'}" stroke="#fff" stroke-width="2"/>`);
    svg.push(`<text x="${X(pos[0]).toFixed(1)}" y="${Y(pos[1]).toFixed(1)}" font-size="14" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="central">${id}</text>`);
  }
  if (caption) svg.push(`<text x="${PAD}" y="22" font-size="15" fill="#333">${caption}</text>`);
  svg.push(`</svg>`);
  const str = svg.join('\n');

  writeFileSync(resolve(`${name}.svg`), str);
  writeFileSync(resolve(`docs/${name}.svg`), str);
  const htmlPath = resolve(`docs/${name}.html`);
  writeFileSync(htmlPath, `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${w.toFixed(0)}px ${h.toFixed(0)}px;margin:0}body{margin:0}</style></head><body>${str}</body></html>`);
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(chrome)) { try { execSync(`"${chrome}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${resolve(`docs/${name}.pdf`)}" "file://${htmlPath}"`, { stdio: 'ignore' }); } catch { /* svg suffices */ } }
  console.log(`wrote ${name}.svg`);
}

// ── the three figures ─────────────────────────────────────────────────────────
const GEN_COLORS = ['#1f5fd0', '#d04f1f'];

// 1. universal cover, cropped around one fundamental-domain parallelogram
const paraPts = [[0, 0], PERIOD_BASIS[0], [PERIOD_BASIS[0][0] + PERIOD_BASIS[1][0], PERIOD_BASIS[0][1] + PERIOD_BASIS[1][1]], PERIOD_BASIS[1]].map(planeOf);
renderFigure('universal-cover', {
  tiles: periodicTiles({ x0: -2.6, x1: 6.6, y0: -3.0, y1: 3.0 }),
  polygons: [{ pts: paraPts, stroke: '#f0a000' }],
  caption: 'Universal cover (periodic triangulation); gold = one fundamental domain.',
});

// 2. hexagonal fundamental domain, plain
renderFigure('fundamental-domain', {
  tiles: hexDomain(),
  caption: 'Fundamental domain — vertex 0 (black) on the left boundary.',
});

// 3. hexagonal domain with the two H1 generators (no labels)
renderFigure('generators', {
  tiles: hexDomain(),
  polylines: GENERATOR_LOOPS.map((verts, i) => ({ pts: tracePath(verts).map(planeOf), color: GEN_COLORS[i] })),
  caption: `H1 generators: ${GENERATOR_LOOPS.map((l) => l.join('→')).join(',  ')}.`,
});
