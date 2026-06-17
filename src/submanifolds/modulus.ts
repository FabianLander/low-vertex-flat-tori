/**
 * Modulus submanifolds — fix the Teichmüller/moduli point of a flat torus.
 *
 * The reduced modulus τ̂ ∈ ℍ/SL(2,ℤ) is only piecewise-smooth in the positions
 * (the reducing SL(2,ℤ) element switches at the fundamental-domain walls). The
 * frozen-chart trick (see `topology/develop.ts`) makes it smooth: capture the
 * reducing matrix `m` at a SEED, then `applyMobius(m, τ(·))` is a smooth function
 * of positions — a plain `value(c)` whose zero set is the desired modulus locus.
 * So a modulus target is just a `ConstraintMap`; no new solver machinery.
 *
 * Because `m` is frozen at the seed, these constraints are valid in the seed's
 * SL(2,ℤ) chamber — fine for a `project` that lands nearby, and `march` simply
 * re-freezes at each substep (rebuild the constraint at the current point).
 *
 *   fixedModulus(τ̂₀)   codim 2: τ̂ = τ̂₀          (a point in moduli space)
 *   modulusWall(c)     codim 1: |Re τ̂| = c       (the rectangular c=0 / rhombic c=½ walls)
 *
 * Jacobians are central finite differences over the ambient config (τ is smooth
 * in the edge lengths, hence in the coordinates) — matching how `newtonFlatten`
 * differentiated its modulus extra-constraints.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { modulus, reduceModulusWithMatrix, applyMobius, type V2 } from '../topology/develop.ts';
import type { ConstraintMap } from '../solvers/types.ts';

/** Central-FD Jacobian (codim×n) of a vector value() over the ambient config. */
function fdJacobian(
  value: (c: ArrayLike<number>, out: Float64Array) => void,
  codim: number,
  c: ArrayLike<number>,
  out: Float64Array,
  scratch: Float64Array,
  vp: Float64Array,
  vm: Float64Array,
  h: number,
): void {
  const n = c.length;
  scratch.set(c);
  const inv2h = 1 / (2 * h);
  for (let col = 0; col < n; col++) {
    const saved = scratch[col];
    scratch[col] = saved + h;
    value(scratch, vp);
    scratch[col] = saved - h;
    value(scratch, vm);
    scratch[col] = saved;
    for (let r = 0; r < codim; r++) out[r * n + col] = (vp[r] - vm[r]) * inv2h;
  }
}

/**
 * The submanifold { τ̂ = τ̂₀ } — a single moduli point (e.g. the square i, the
 * hexagonal e^{iπ/3}). Chart frozen at `seed`. codim 2.
 */
export function fixedModulus(torus: Triangulation, seed: ArrayLike<number>, tauHat0: V2, h = 1e-7): ConstraintMap {
  const { m } = reduceModulusWithMatrix(modulus(torus, seed).tau);
  const value = (c: ArrayLike<number>, out: Float64Array): void => {
    const t = applyMobius(m, modulus(torus, c).tau);
    out[0] = t[0] - tauHat0[0];
    out[1] = t[1] - tauHat0[1];
  };
  let scratch: Float64Array | null = null;
  const vp = new Float64Array(2), vm = new Float64Array(2);
  return {
    label: 'fixedModulus',
    codim: 2,
    value,
    jacobian(c, out) {
      if (!scratch || scratch.length !== c.length) scratch = new Float64Array(c.length);
      fdJacobian(value, 2, c, out, scratch, vp, vm, h);
    },
  };
}

/**
 * The submanifold { |Re τ̂| = c } — the rectangular (c=0) or rhombic-wall (c=½)
 * locus, and everything between. Chart (and the sign of Re τ̂) frozen at `seed`.
 * codim 1.
 */
export function modulusWall(torus: Triangulation, seed: ArrayLike<number>, c: number, h = 1e-7): ConstraintMap {
  const { tau: tauHat, m } = reduceModulusWithMatrix(modulus(torus, seed).tau);
  const sgn = tauHat[0] >= 0 ? 1 : -1;
  const value = (q: ArrayLike<number>, out: Float64Array): void => {
    out[0] = applyMobius(m, modulus(torus, q).tau)[0] - sgn * c;
  };
  let scratch: Float64Array | null = null;
  const vp = new Float64Array(1), vm = new Float64Array(1);
  return {
    label: `modulusWall(${c})`,
    codim: 1,
    value,
    jacobian(q, out) {
      if (!scratch || scratch.length !== q.length) scratch = new Float64Array(q.length);
      fdJacobian(value, 1, q, out, scratch, vp, vm, h);
    },
  };
}
