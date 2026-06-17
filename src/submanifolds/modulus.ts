/**
 * Modulus submanifolds — fix the Teichmüller/moduli point of a flat torus.
 *
 * The reduced modulus τ̂ ∈ ℍ/SL(2,ℤ) is only piecewise-smooth in the positions
 * (the reducing SL(2,ℤ) element switches at the fundamental-domain walls). The
 * frozen-chart trick makes it smooth: capture the reducing matrix `m` at a SEED,
 * then `applyMobius(m, τ(·))` is a smooth function of positions whose zero set is
 * the desired modulus locus. So a modulus target is just an `Fn`.
 *
 * In code that is exactly a post-composition: take the `tau` map from `functions/`
 * and stack the (exact) frozen Möbius and an affine shift on top via `postcompose`.
 * The chain rule fuses their Jacobians, so the only finite difference in the chain
 * is `tau`'s — there is no bespoke differentiation here.
 *
 *   fixedModulus(τ̂₀)   codim 2: τ̂ = τ̂₀          (a point in moduli space)
 *   modulusWall(c)     codim 1: |Re τ̂| = c       (the rectangular c=0 / rhombic c=½ walls)
 *
 * Because `m` (and, for the wall, the sign of Re τ̂) is frozen at the seed, these
 * are valid in the seed's SL(2,ℤ) chamber — fine for a `project` that lands nearby,
 * and `march` re-freezes by rebuilding the constraint at each substep.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { modulus, reduceModulusWithMatrix, applyMobius, type Sl2z, type V2 } from '../topology/develop.ts';
import { tau } from '../functions/tau.ts';
import { affine, postcompose, type SmoothMap } from '../functions/compose.ts';
import type { Fn } from '../functions/types.ts';
/**
 * The Möbius map z ↦ (az+b)/(cz+d) of m ∈ SL(2,ℤ) on ℍ, as a `SmoothMap` ℝ²→ℝ²
 * with its EXACT Jacobian. The map is holomorphic, so its real 2×2 derivative is
 * the conformal [[Re w′, −Im w′],[Im w′, Re w′]]; for SL(2,ℤ) (ad−bc=1),
 * w′(z) = 1/(cz+d)².
 */
function mobiusMap(m: Sl2z): SmoothMap {
  const c = m[2], d = m[3];
  return {
    inDim: 2,
    outDim: 2,
    value(x, out) {
      const w = applyMobius(m, [x[0], x[1]]);
      out[0] = w[0];
      out[1] = w[1];
    },
    jacobian(x, out) {
      // s = (cz + d)²; w′ = 1/s = conj(s)/|s|².
      const re = c * x[0] + d, im = c * x[1];
      const sr = re * re - im * im, si = 2 * re * im;
      const den = sr * sr + si * si;
      const wr = sr / den, wi = -si / den;     // w′ = wr + i·wi
      out[0] = wr; out[1] = -wi;
      out[2] = wi; out[3] = wr;
    },
  };
}

/** Frozen modulus map c ↦ applyMobius(m, τ(c)) ∈ ℝ², smooth in the seed's chamber. */
function frozenModulus(torus: Triangulation, seed: ArrayLike<number>): { fn: Fn; tauHat: V2 } {
  const { tau: tauHat, m } = reduceModulusWithMatrix(modulus(torus, seed).tau);
  return { fn: postcompose(mobiusMap(m), tau(torus), 'frozenModulus'), tauHat };
}

/**
 * The submanifold { τ̂ = τ̂₀ } — a single moduli point (e.g. the square i, the
 * hexagonal e^{iπ/3}), as an `Fn` (dim 2). Chart frozen at `seed`.
 */
export function fixedModulus(torus: Triangulation, seed: ArrayLike<number>, tauHat0: V2): Fn {
  const { fn } = frozenModulus(torus, seed);
  // g(c) = applyMobius(m, τ(c)) − τ̂₀.
  return postcompose(affine([1, 0, 0, 1], [-tauHat0[0], -tauHat0[1]]), fn, 'fixedModulus');
}

/**
 * The submanifold { |Re τ̂| = c } — the rectangular (c=0) or rhombic-wall (c=½)
 * locus, and everything between, as an `Fn` (dim 1). Chart (and the sign of Re τ̂)
 * frozen at `seed`.
 */
export function modulusWall(torus: Triangulation, seed: ArrayLike<number>, c: number): Fn {
  const { fn, tauHat } = frozenModulus(torus, seed);
  const sgn = tauHat[0] >= 0 ? 1 : -1;
  // g(c) = Re(applyMobius(m, τ(c))) − sgn·c.
  return postcompose(affine([1, 0], [-sgn * c]), fn, `modulusWall(${c})`);
}
