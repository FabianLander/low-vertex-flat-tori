/**
 * Random perturbations of an embedding and a seeded RNG.
 */

import { PaperTorus } from './embedding';

/**
 * Mulberry32: small, fast, deterministic PRNG. Returns uniform [0,1).
 * Period is only 2³² outputs (≈ 4.3e9) — at 24 draws/attempt that is ~1.8e8
 * distinct attempts before the stream repeats exactly. Fine for tests and
 * short runs; for billions-scale searches use xoshiro128pp (the default via
 * makeRng). Kept for back-compat and reproducing old runs.
 */
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

/** SplitMix32 — expands a 32-bit seed into well-mixed 32-bit words. Used to
 *  fill a larger PRNG state from a single seed (standard practice). */
function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

/**
 * xoshiro128++ (Blackman & Vigna): 128-bit state, proven period 2¹²⁸ − 1,
 * pure 32-bit ops, excellent statistical quality. Returns uniform [0,1).
 *
 * Effectively inexhaustible for this project — even 10¹⁵ attempts × 24 draws
 * ≈ 2.4e16 outputs is negligible against 2¹²⁸ ≈ 3.4e38. Distinct seeds give
 * well-separated streams (state filled via SplitMix32), so parallel workers
 * with different seeds explore independent regions. This is the default RNG
 * for the search scripts.
 */
export function xoshiro128pp(seed: number): () => number {
  const sm = splitmix32(seed);
  let s0 = sm(), s1 = sm(), s2 = sm(), s3 = sm();
  if ((s0 | s1 | s2 | s3) === 0) s0 = 1; // state must not be all-zero
  const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0;
  return () => {
    const result = (rotl((s0 + s3) >>> 0, 7) + s0) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);
    return result / 4294967296;
  };
}

/**
 * Select a PRNG by name. Default 'xoshiro' (xoshiro128++); 'mulberry' picks the
 * legacy mulberry32 (period 2³²) for reproducing old runs. Throws on unknown.
 */
export function makeRng(name: string | undefined, seed: number): () => number {
  switch (name ?? 'xoshiro') {
    case 'xoshiro':
    case 'xoshiro128++':
      return xoshiro128pp(seed);
    case 'mulberry':
    case 'mulberry32':
      return mulberry32(seed);
    default:
      throw new Error(`unknown --rng: ${name}; choices: xoshiro, mulberry`);
  }
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
