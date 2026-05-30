/**
 * Central finite-difference gradient. Lets us write an energy by just
 * providing `compute()` and synthesizing `gradient()` from it.
 *
 * Cost: 2 * positions.length evaluations of `compute` per gradient call.
 * For our problem that's 2 * 24 = 48 evaluations per gradient — cheap as long
 * as compute() itself is cheap.
 */

import type { RepulsionEnergy } from './types';

export function fdGradient(
  compute: (p: ArrayLike<number>) => number,
  positions: Float64Array,
  out: Float64Array,
  h = 1e-6,
): void {
  const inv2h = 1 / (2 * h);
  for (let c = 0; c < positions.length; c++) {
    const saved = positions[c];
    positions[c] = saved + h;
    const ep = compute(positions);
    positions[c] = saved - h;
    const em = compute(positions);
    positions[c] = saved;
    out[c] = (ep - em) * inv2h;
  }
}

/**
 * Wrap a compute-only function as a RepulsionEnergy whose gradient is
 * computed by central finite differences. Convenient for prototyping new
 * energies: pick a compute(), get gradient() for free.
 */
export function energyFromCompute(
  label: string,
  compute: (p: ArrayLike<number>) => number,
  h?: number,
): RepulsionEnergy {
  return {
    label,
    compute,
    gradient(positions, out) {
      fdGradient(compute, positions, out, h);
    },
  };
}
