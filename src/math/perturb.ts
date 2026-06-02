/**
 * Random perturbations of an embedding and a seeded RNG.
 */

import { PaperTorus } from './embedding';

/** Mulberry32: small, fast, deterministic PRNG. Returns uniform [0,1). */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller standard normal from a uniform [0,1) source. */
function gaussian(rng: () => number): number {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** New PaperTorus = base + N(0, magnitude) noise on every coordinate. */
export function perturb(
  base: PaperTorus,
  magnitude: number,
  rng: () => number,
): PaperTorus {
  const out = base.clone();
  for (let i = 0; i < out.positions.length; i++) {
    out.positions[i] += magnitude * gaussian(rng);
  }
  return out;
}
