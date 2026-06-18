/**
 * reduce — the structure of the space the modulus lives in: the upper half-plane
 * ℍ (Teichmüller space of the torus, with a marking) and its quotient
 * ℍ/SL(2,ℤ) (moduli space, the marking forgotten).
 *
 * Its sibling `./develop.ts` MEASURES the raw modulus τ ∈ ℍ from a realization;
 * this module owns the SPACE that τ lives in — the SL(2,ℤ) action on ℍ and the
 * quotient map down to moduli space (`reduceModulus`). That split is the whole
 * point: developing reads a number off a torus; reducing is a fact about
 * ℍ/SL(2,ℤ), independent of any torus (this file is torus-blind — `Vec2` in/out).
 *
 * A point of either space is a `Vec2` (a complex number, like everywhere else); the
 * space it belongs to is carried by the variable name (`tau` raw / `tauHat` reduced)
 * and the function it came through, not the type — the same plain-tuple convention as
 * the rest of `geometry/`. `develop`'s `Modulus` (singular) is the measurement record;
 * "moduli" (plural) is the space.
 *
 * Pure: no DOM, no three.js. (Depends only on `geometry/vec2`.)
 */

import type { Vec2 } from '../geometry/vec2.ts';

// ─── the SL(2,ℤ) action on ℍ ──────────────────────────────────────────────────

/** An element of SL(2,ℤ) as [a, b, c, d] acting by τ ↦ (aτ + b)/(cτ + d). */
export type Sl2z = readonly [number, number, number, number];

/** Apply the Möbius transformation of m ∈ SL(2,ℤ) to τ (complex arithmetic). */
export function applyMobius(m: Sl2z, tau: Vec2): Vec2 {
  const [a, b, c, d] = m;
  const nx = a * tau[0] + b, ny = a * tau[1];
  const dx = c * tau[0] + d, dy = c * tau[1];
  const den = dx * dx + dy * dy;
  return [(nx * dx + ny * dy) / den, (ny * dx - nx * dy) / den];
}

// ─── the quotient ℍ → ℍ/SL(2,ℤ) (reduction into the fundamental domain) ─────────

/**
 * Reduce τ ∈ ℍ into the standard fundamental domain
 * { |Re τ| ≤ ½, |τ| ≥ 1 } via the generators T: τ↦τ+1 and S: τ↦−1/τ,
 * also returning the SL(2,ℤ) element m with applyMobius(m, τ) = τ̂.
 *
 * The matrix is what makes τ̂ usable as a smooth constraint: the reduction
 * map itself is only piecewise-smooth (it switches group elements at the
 * fundamental-domain walls), but Re/Im of applyMobius(m, τ(p)) with m FROZEN
 * is a smooth function of positions — freeze m at a seed, then constrain.
 */
export function reduceModulusWithMatrix(tau: Vec2): { tau: Vec2; m: Sl2z } {
  let re = tau[0], im = tau[1];
  let a = 1, b = 0, c = 0, d = 1;
  for (let guard = 0; guard < 1000; guard++) {
    const shift = Math.round(re);          // T^{-shift}: bring Re into [-½, ½]
    re -= shift;
    a -= shift * c; b -= shift * d;        // [1,-shift;0,1] · m
    const n = re * re + im * im;
    if (n >= 1 - 1e-15) break;             // already |τ| ≥ 1
    re = -re / n; im = im / n;             // S: τ ↦ −1/τ
    const na = -c, nb = -d;                // [0,-1;1,0] · m
    c = a; d = b; a = na; b = nb;
  }
  return { tau: [re, im], m: [a, b, c, d] };
}

/**
 * Reduce τ ∈ ℍ into the standard fundamental domain
 * { |Re τ| ≤ ½, |τ| ≥ 1 } via the generators T: τ↦τ+1 and S: τ↦−1/τ.
 */
export function reduceModulus(tau: Vec2): Vec2 {
  return reduceModulusWithMatrix(tau).tau;
}

// ─── the special points of moduli space (the orbifold cone points) ──────────────

/** The square torus τ̂ = i — the order-4 (D₄-symmetric) point of moduli space. */
export const SQUARE: Vec2 = [0, 1];

/** The hexagonal torus τ̂ = e^{iπ/3} = ½ + i√3/2 — the order-6 point of moduli space
 *  (a corner of the fundamental domain, on both |Re τ̂| = ½ and |τ̂| = 1). */
export const HEXAGONAL: Vec2 = [0.5, Math.sqrt(3) / 2];
