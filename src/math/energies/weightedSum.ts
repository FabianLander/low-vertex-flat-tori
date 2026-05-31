/**
 * Weighted sum of repulsion energies: E(x) = Σ_k w_k · E_k(x).
 *
 * Lets us run the flow on a combined objective — e.g. an intersection energy
 * (which keeps the surface embedded) plus λ · cell-margin (which fattens the
 * margin) — so flattening, embedding, and fattening happen in one descent.
 *
 * The gradient is finite-differenced over the combined `compute` (one FD pass,
 * cheaper than differencing each term separately and identical in result).
 *
 * SCALE NOTE: cell-margin is scale-free, but area/chord-based intersection
 * energies are not (they carry units of length²). When mixing the two, work at
 * a fixed scale — the fatten script normalizes each sample to √area = 1 — so a
 * single λ is meaningful across samples.
 */

import { fdGradient } from './finiteDiffGradient';
import type { RepulsionEnergy } from './types';

export type WeightedTerm = { energy: RepulsionEnergy; weight: number };

export function weightedSum(label: string, terms: WeightedTerm[]): RepulsionEnergy {
  const compute = (p: ArrayLike<number>): number => {
    let e = 0;
    for (const t of terms) e += t.weight * t.energy.compute(p);
    return e;
  };
  return {
    label,
    compute,
    gradient(positions, out) {
      fdGradient(compute, positions, out);
    },
  };
}
