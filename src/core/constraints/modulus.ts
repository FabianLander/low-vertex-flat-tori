/**
 * modulus — the modulus condition, as a clean grid: pin the modulus to a LOCUS in either
 * SPACE. Every constraint here is
 *
 *     constraint = postcompose(locus, chart ∘ tau)
 *
 * - `tau` (config → τ ∈ ℍ) is the same analytic measurement `Fn` (from `moduli/modulus`);
 * - the CHART (ℍ → ℍ) picks the space: identity for **Teichmüller** (raw τ), the frozen
 *   reduction Möbius `mobiusMap(m)` for **moduli** (reduced τ̂; `m` frozen at a seed);
 * - the LOCUS (ℍ → ℝᵏ) picks the shape: `point` (codim 2) / `verticalLine` / `circle` (codim 1).
 *
 * So the family is a 2 × 3 grid (`pinTeichmuller`/`pinModuli` × `point`/`verticalLine`/`circle`),
 * with the common cells named (`fixedModulus`, `modulusWall`). The other cells are spelled
 * directly, e.g. `pinTeichmuller(t, point(τ0))` or `pinModuli(t, seed, circle([0,0],1))`.
 * `tau`, `mobiusMap`, `affine`, and `postcompose` are all analytic, so the chain rule
 * fuses each combination into an exact-Jacobian `Fn` — no finite differences anywhere.
 *
 * The reduced τ̂ is only piecewise-smooth (the SL(2,ℤ) element jumps at the
 * fundamental-domain walls), so the moduli chart FREEZES `m` at the seed: it holds in the
 * seed's SL(2,ℤ) chamber — fine for a nearby `project`; `march` re-freezes per substep.
 * Teichmüller constraints use no chart (identity), so they are globally smooth — but their
 * target is the RAW τ, marking-dependent (not the SL(2,ℤ)-class).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { modulus, tauJacobian } from '@core/moduli/modulus.ts';
import { reduceModulusWithMatrix, applyMobius, type Sl2z } from '@core/moduli/reduce.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import { affine, postcompose, type SmoothMap } from '@core/functions/compose.ts';
import type { Fn } from '@core/functions/types.ts';

// ─── the measurement ────────────────────────────────────────────────────────

/**
 * tau — the Teichmüller modulus τ(c) = (Re τ, Im τ) ∈ ℍ, read off the developing
 * map's holonomy. dim 2, with an EXACT analytic Jacobian (`tauJacobian`, the
 * forward-mode complex differentiation of the frame develop). Defined everywhere the
 * developing map is (off the flat locus too, where `project` evaluates it); on a
 * non-flat config τ is the holonomy of a non-translation, still a smooth function of
 * positions.
 */
export function tau(triang: Triangulation): Fn {
  return {
    label: 'tau',
    dim: 2,
    value: (c, out) => { const t = modulus(triang, c).tau; out[0] = t[0]; out[1] = t[1]; },
    jacobian: (c, out) => { tauJacobian(triang, c, out); },
  };
}

// ─── loci: the shape a modulus constraint cuts out of ℍ (`SmoothMap`, inDim 2) ─

/** Pin to the point z₀ ∈ ℍ — codim 2 (`z − z₀`). */
export const point = (z0: Vec2): SmoothMap => affine([1, 0, 0, 1], [-z0[0], -z0[1]]);

/** Pin to the vertical line Re z = c — codim 1 (`Re z − c`). */
export const verticalLine = (c: number): SmoothMap => affine([1, 0], [-c]);

/** Pin to the circle |z − center| = r — codim 1. Squared form `|z−center|² − r²`, so it is
 *  analytic everywhere (no √); its zero set is the circle, derivative `2(z − center)`. */
export const circle = (center: Vec2, r: number): SmoothMap => ({
  inDim: 2,
  outDim: 1,
  value: (x, out) => { const dx = x[0] - center[0], dy = x[1] - center[1]; out[0] = dx * dx + dy * dy - r * r; },
  jacobian: (x, out) => { out[0] = 2 * (x[0] - center[0]); out[1] = 2 * (x[1] - center[1]); },
});

// ─── the chart: which space (the only difference between the two columns) ─────

/**
 * The Möbius map z ↦ (az+b)/(cz+d) of m ∈ SL(2,ℤ) on ℍ, as a `SmoothMap` ℝ²→ℝ²
 * with its EXACT Jacobian. Holomorphic, so the real 2×2 derivative is the conformal
 * [[Re w′, −Im w′],[Im w′, Re w′]]; for SL(2,ℤ) (ad−bc=1), w′(z) = 1/(cz+d)².
 * (Stays here: it produces a `functions/SmoothMap`, so it can't sink into the
 * `geometry`-only `moduli/` layer.)
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

/** The frozen reduction at a seed: the SL(2,ℤ) element m taking τ→τ̂, and τ̂ itself. */
function frozen(triang: Triangulation, seed: ArrayLike<number>): { m: Sl2z; tauHat: Vec2 } {
  const { tau: tauHat, m } = reduceModulusWithMatrix(modulus(triang, seed).tau);
  return { m, tauHat };
}

/** Moduli constraint with the chart matrix already chosen: pin τ̂ = applyMobius(m, τ) to `locus`. */
function moduliWith(triang: Triangulation, m: Sl2z, locus: SmoothMap): Fn {
  return postcompose(locus, postcompose(mobiusMap(m), tau(triang), 'frozenModulus'));
}

// ─── the two charts (the columns of the grid) ─────────────────────────────────

/**
 * Teichmüller-space constraint: pin the RAW τ to `locus`. Identity chart — no seed,
 * globally smooth. The target lives in the current marking (raw τ, not the SL(2,ℤ)-class).
 */
export function pinTeichmuller(triang: Triangulation, locus: SmoothMap): Fn {
  return postcompose(locus, tau(triang));
}

/**
 * Moduli-space constraint: pin the REDUCED τ̂ to `locus`. The reduction chart is frozen at
 * `seed` (holds in its SL(2,ℤ) chamber; `march` re-freezes per substep).
 */
export function pinModuli(triang: Triangulation, seed: ArrayLike<number>, locus: SmoothMap): Fn {
  return moduliWith(triang, frozen(triang, seed).m, locus);
}

// ─── named conveniences (the common cells of the grid) ────────────────────────

/** { τ̂ = τ̂₀ } — a moduli point (the square i, hexagonal ρ, …). codim 2, chart frozen at seed. */
export function fixedModulus(triang: Triangulation, seed: ArrayLike<number>, tauHat0: Vec2): Fn {
  return pinModuli(triang, seed, point(tauHat0));
}

/**
 * { |Re τ̂| = c } — the rectangular (c=0) / rhombic (c=½) wall and between, as a codim-1
 * `Fn`. BOTH the chart `m` and the SIGN of Re τ̂ are frozen at `seed`, so it targets the
 * vertical line Re τ̂ = sgn·c in the seed's chamber.
 */
export function modulusWall(triang: Triangulation, seed: ArrayLike<number>, c: number): Fn {
  const { m, tauHat } = frozen(triang, seed);
  const sgn = tauHat[0] >= 0 ? 1 : -1;
  return moduliWith(triang, m, verticalLine(sgn * c));
}
