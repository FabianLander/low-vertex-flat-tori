/**
 * modulus — the Teichmüller modulus condition: the measurement τ(c) ∈ ℍ, and the
 * constraints that pin it (`fixedModulus` to a point, `modulusWall` to a wall).
 *
 * The measurement `tau` is the developing map's modulus as a function of positions
 * — smooth in the edge lengths, but with no closed-form Jacobian yet, so it is
 * finite-differenced. The *reduced* modulus τ̂ ∈ ℍ/SL(2,ℤ) is only piecewise-smooth
 * (the reducing SL(2,ℤ) element jumps at the fundamental-domain walls), so the
 * constraints use the **frozen-chart trick**: capture the reducing matrix `m` at a
 * seed, then `applyMobius(m, τ(·))` is smooth — a postcomposition of the exact
 * frozen Möbius (and an affine shift / take-Re) onto `tau`. The chain rule fuses
 * the Jacobians, so the only finite difference in the chain is `tau`'s.
 *
 *   fixedModulus(τ̂₀)   codim 2: τ̂ = τ̂₀      (a moduli point — the square i, hexagonal …)
 *   modulusWall(c)     codim 1: |Re τ̂| = c   (rectangular c=0 / rhombic c=½ walls, and between)
 *
 * Because `m` (and, for the wall, the sign of Re τ̂) is frozen at the seed, these
 * hold in the seed's SL(2,ℤ) chamber — fine for a nearby `project`; `march`
 * re-freezes by rebuilding the constraint at each substep. An analytic τ is a
 * future drop-in behind this same `tau` `Fn`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { modulus, reduceModulusWithMatrix, applyMobius, type Sl2z, type V2 } from '../topology/develop.ts';
import { fdFn, affine, postcompose, type SmoothMap } from '../functions/compose.ts';
import type { Fn } from '../functions/types.ts';

// ─── the measurement ────────────────────────────────────────────────────────

/**
 * tau — the Teichmüller modulus τ(c) = (Re τ, Im τ) ∈ ℍ, read off the developing
 * map's holonomy. dim 2; finite-differenced (no closed-form Jacobian yet). Defined
 * only on (near-)flat configs — off the flat locus the holonomy isn't a pure
 * translation; callers project onto `flat` first.
 */
export function tau(triang: Triangulation): Fn {
  return fdFn('tau', 2, (c, out) => {
    const t = modulus(triang, c).tau;
    out[0] = t[0];
    out[1] = t[1];
  });
}

// ─── the constraints (frozen-chart) ─────────────────────────────────────────

/**
 * The Möbius map z ↦ (az+b)/(cz+d) of m ∈ SL(2,ℤ) on ℍ, as a `SmoothMap` ℝ²→ℝ²
 * with its EXACT Jacobian. Holomorphic, so the real 2×2 derivative is the conformal
 * [[Re w′, −Im w′],[Im w′, Re w′]]; for SL(2,ℤ) (ad−bc=1), w′(z) = 1/(cz+d)².
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
function frozenModulus(triang: Triangulation, seed: ArrayLike<number>): { fn: Fn; tauHat: V2 } {
  const { tau: tauHat, m } = reduceModulusWithMatrix(modulus(triang, seed).tau);
  return { fn: postcompose(mobiusMap(m), tau(triang), 'frozenModulus'), tauHat };
}

/**
 * The condition { τ̂ = τ̂₀ } — a single moduli point, as an `Fn` (dim 2). Chart
 * frozen at `seed`: g(c) = applyMobius(m, τ(c)) − τ̂₀.
 */
export function fixedModulus(triang: Triangulation, seed: ArrayLike<number>, tauHat0: V2): Fn {
  const { fn } = frozenModulus(triang, seed);
  return postcompose(affine([1, 0, 0, 1], [-tauHat0[0], -tauHat0[1]]), fn, 'fixedModulus');
}

/**
 * The condition { |Re τ̂| = c } — the rectangular (c=0) / rhombic (c=½) wall and
 * between, as an `Fn` (dim 1). Chart (and the sign of Re τ̂) frozen at `seed`:
 * g(c) = Re(applyMobius(m, τ(c))) − sgn·c.
 */
export function modulusWall(triang: Triangulation, seed: ArrayLike<number>, c: number): Fn {
  const { fn, tauHat } = frozenModulus(triang, seed);
  const sgn = tauHat[0] >= 0 ? 1 : -1;
  return postcompose(affine([1, 0], [-sgn * c]), fn, `modulusWall(${c})`);
}
