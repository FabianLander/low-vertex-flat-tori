/**
 * Seed sources for the `collect` driver — each a `() => Float64Array` that draws
 * the next starting configuration. They compose `configuration/perturb` + an RNG
 * with a perturbation-magnitude (σ) draw, so a search just picks a source and a σ
 * schedule. Returning bare positions (a configuration is a `Float64Array`).
 *
 * Pure: no three.js, no DOM.
 */

import { perturb } from '../configuration/perturb.ts';

/** Draws a perturbation magnitude σ per attempt. */
export type SigmaDraw = () => number;

/** σ ~ uniform[lo, hi]. */
export function uniformSigma(lo: number, hi: number, rng: () => number): SigmaDraw {
  return () => lo + rng() * (hi - lo);
}

/** σ ~ log-uniform[lo, hi]: mostly small local moves with a fat tail of big jumps. */
export function logSigma(lo: number, hi: number, rng: () => number): SigmaDraw {
  const a = Math.log(lo), b = Math.log(hi);
  return () => Math.exp(a + rng() * (b - a));
}

/** Seeds = a fixed `base` (e.g. Rich's reference) perturbed by σ each draw. */
export function perturbedSeeds(base: ArrayLike<number>, sigma: SigmaDraw, rng: () => number): () => Float64Array {
  return () => perturb(base, sigma(), rng);
}

/** Seeds = a random member of a (possibly growing) `pool`, perturbed by σ. Push
 *  accepted configs back into `pool` (e.g. in `onAccept`) to diffuse the walk. */
export function poolSeeds(pool: ArrayLike<number>[], sigma: SigmaDraw, rng: () => number): () => Float64Array {
  return () => perturb(pool[Math.floor(rng() * pool.length)], sigma(), rng);
}

/** Seeds = each of `n` coordinates i.i.d. uniform in [−size, size] (from scratch). */
export function uniformSeeds(n: number, size: number, rng: () => number): () => Float64Array {
  return () => {
    const p = new Float64Array(n);
    for (let i = 0; i < n; i++) p[i] = (rng() * 2 - 1) * size;
    return p;
  };
}
