/**
 * Seed sources for the `collect` driver — each a `() => Float64Array` that draws
 * the next starting configuration. The random sources compose `sampling/perturb` +
 * an RNG with a perturbation-magnitude (σ) draw; the deterministic `gridSeeds` walks
 * a grid in a coordinate system's parameters and returns `null` once exhausted (a
 * FINITE source — `collect` stops on null). Returning bare positions (a
 * configuration is a `Float64Array`).
 *
 * Pure: no three.js, no DOM.
 */

import { perturb } from './perturb.ts';
import type { ConfigSpace } from '../configuration/space.ts';

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

/** One axis of a parameter grid: a list of values for parameter dimension `axis`. */
export interface AxisGrid {
  readonly axis: number;
  readonly values: readonly number[];
}

/**
 * Deterministic seeds = the Cartesian product of grid values over selected parameter
 * axes of a coordinate `space`, every other axis held at `base`; each combination
 * pushed through φ to a configuration. The complement to the random sources: a finite,
 * reproducible sweep. Returns `null` once the product is exhausted (`collect` stops).
 *
 * `base` is a parameter point in the space's ℝⁿ (length `space.dim`). Anchoring it on a
 * known solution's parameters — and including that value in each swept axis — makes the
 * unperturbed solution one of the samples (the legacy "sweep outward from the symmetric
 * solution" pattern, generalized to any coordinate system).
 */
export function gridSeeds(
  space: ConfigSpace,
  base: ArrayLike<number>,
  axes: readonly AxisGrid[],
): () => Float64Array | null {
  if (base.length !== space.dim) {
    throw new Error(`gridSeeds: base has ${base.length} params, expected ${space.dim}`);
  }
  const x = new Float64Array(base);            // working parameter point
  const digits = new Array<number>(axes.length).fill(0);
  let exhausted = axes.some((a) => a.values.length === 0);
  let started = false;

  return () => {
    if (exhausted) return null;
    if (started) {
      // advance the mixed-radix odometer (axes[0] varies fastest)
      let k = 0;
      for (; k < axes.length; k++) {
        if (++digits[k] < axes[k].values.length) break;
        digits[k] = 0;
      }
      if (k === axes.length) { exhausted = true; return null; }  // rolled over → done
    }
    started = true;
    x.set(base);
    for (let k = 0; k < axes.length; k++) x[axes[k].axis] = axes[k].values[digits[k]];
    const out = new Float64Array(space.ambient);
    space.push(x, out);
    return out;
  };
}
