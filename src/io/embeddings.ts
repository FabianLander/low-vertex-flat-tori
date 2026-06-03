/**
 * Load flat-torus embeddings from the CSV datasets as PaperToruses.
 *
 * A row is the 3V raw vertex coordinates (V=8 ⟹ 24 columns) of one embedding,
 * paired with a `Torus` (the combinatorics). Each row is a different point in
 * R^3V ⟹ a different modulus τ — so a seed file is a whole family of moduli of
 * one combinatorial type (e.g. data/explore-from-seeds/seed-7.csv = Rich's torus).
 *
 * The `-normalized` datasets are gauge-reduced (fewer columns) and are skipped.
 */

import type { Torus } from '../tori/defineTorus';
import { PaperTorus } from '../math/embedding';

/** One embedding from a coordinate row (extra trailing columns are ignored). */
export function paperFromRow(torus: Torus, row: ArrayLike<number>): PaperTorus {
  const n = torus.vertexCount * 3;
  if (row.length < n) throw new Error(`embedding row has ${row.length} columns, need ≥ ${n}`);
  const pos = new Float64Array(n);
  for (let i = 0; i < n; i++) pos[i] = row[i];
  return new PaperTorus(torus, pos);
}

/** Parse a CSV of embeddings; rows without the full 3V coordinates are skipped. */
export function parseEmbeddings(csvText: string, torus: Torus): PaperTorus[] {
  const n = torus.vertexCount * 3;
  const out: PaperTorus[] = [];
  for (const line of csvText.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const nums = s.split(',').map(Number);
    if (nums.length < n || nums.some(Number.isNaN)) continue;
    out.push(paperFromRow(torus, nums));
  }
  return out;
}
