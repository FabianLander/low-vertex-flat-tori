/**
 * The boundary bundle's serialized form: `positions ⇄ CSV row`. One row is the 3V
 * raw vertex coordinates of one realization (V=8 ⟹ 24 full-precision floats),
 * `x0,y0,z0, …`. The data format the searches write and the viewers read.
 *
 * Note the boundary asymmetry (the reason this lives WITH `PaperTorus`): WRITING is
 * triangulation-free — a row is just the numbers; READING needs the triangulation to
 * mean anything (a row pairs with a `T` to become a bundle). That is exactly the
 * `PaperTorus` principle — "a CSV row needs its `T`" — so `paperFromRow` is just
 * `makePaperTorus` from a parsed row, a sibling of `paperTorusFromVec3s`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { makePaperTorus, type PaperTorus } from './paperTorus.ts';

/** One bundle from a coordinate row (extra trailing columns — certificates — are ignored). */
export function paperFromRow(triang: Triangulation, row: ArrayLike<number>): PaperTorus {
  const n = triang.vertexCount * 3;
  if (row.length < n) throw new Error(`embedding row has ${row.length} columns, need ≥ ${n}`);
  const pos = new Float64Array(n);
  for (let i = 0; i < n; i++) pos[i] = row[i];
  return makePaperTorus(triang, pos);
}

/** Parse a CSV of embeddings; rows without the full 3V coordinates are skipped. */
export function parseEmbeddings(csvText: string, triang: Triangulation): PaperTorus[] {
  const n = triang.vertexCount * 3;
  const out: PaperTorus[] = [];
  for (const line of csvText.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length < n || nums.some(Number.isNaN)) continue;
    out.push(paperFromRow(triang, nums));
  }
  return out;
}

/** A bundle's positions as one full-precision CSV row (the write side of the format). */
export function paperToRow(paper: PaperTorus): string {
  return Array.from(paper.positions).join(',');
}
