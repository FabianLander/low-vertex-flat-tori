/**
 * Random perturbation of a configuration — bare positions in, bare positions out
 * (the configuration is a `Float64Array`, not a wrapper object).
 */

import { gaussian } from './rng.ts';

/** A new positions array = `base` + N(0, magnitude) Gaussian noise per coordinate. */
export function perturb(base: ArrayLike<number>, magnitude: number, rng: () => number): Float64Array {
  const out = new Float64Array(base.length);
  for (let i = 0; i < base.length; i++) out[i] = base[i] + magnitude * gaussian(rng);
  return out;
}
