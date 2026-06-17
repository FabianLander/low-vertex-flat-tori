/**
 * The algebra of differentiable maps: finite-difference a value-only map into an
 * `Fn` (`fdFn`), and post-compose a smooth outer map onto an `Fn` by the chain
 * rule (`postcompose`, with the affine outer map `affine`).
 *
 * `postcompose(g, f)` is how a measured map becomes a constraint of a different
 * shape without re-deriving anything: the modulus wall is, in effect,
 * `postcompose(takeRe ∘ mobius(m), tau)` — the frozen Möbius and the take-Re are
 * exact outer maps stacked on top of the (finite-differenced) τ map, and the
 * chain rule fuses their Jacobians automatically.
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn } from './types.ts';

/**
 * A smooth map between coordinate spaces, ℝ^inDim → ℝ^outDim, with its
 * outDim×inDim Jacobian — the outer map in a `postcompose`. (Distinct from `Fn`,
 * which is specifically a map *of the configuration* C.)
 */
export interface SmoothMap {
  readonly inDim: number;
  readonly outDim: number;
  value(x: ArrayLike<number>, out: Float64Array): void;
  /** outDim×inDim row-major (stride inDim). */
  jacobian(x: ArrayLike<number>, out: Float64Array): void;
}

const DEFAULT_H = 1e-7;

/**
 * Build an `Fn` from a value-only map by central finite differences: the
 * returned Jacobian is k×n, computed with 2n evaluations of `value` over a
 * private scratch copy of the config (the input is never mutated). The single
 * place finite-differencing lives — maps with a closed-form derivative supply
 * their own `jacobian` instead.
 */
export function fdFn(
  label: string,
  dim: number,
  value: (c: ArrayLike<number>, out: Float64Array) => void,
  h = DEFAULT_H,
): Fn {
  let scratch: Float64Array | null = null;
  const vp = new Float64Array(dim);
  const vm = new Float64Array(dim);
  return {
    label,
    dim,
    value,
    jacobian(c, out) {
      const n = c.length;
      if (!scratch || scratch.length !== n) scratch = new Float64Array(n);
      scratch.set(c);
      const inv2h = 1 / (2 * h);
      for (let col = 0; col < n; col++) {
        const saved = scratch[col];
        scratch[col] = saved + h; value(scratch, vp);
        scratch[col] = saved - h; value(scratch, vm);
        scratch[col] = saved;
        for (let r = 0; r < dim; r++) out[r * n + col] = (vp[r] - vm[r]) * inv2h;
      }
    },
  };
}

/**
 * The affine map x ↦ A·x + b, ℝ^inDim → ℝ^outDim. `A` is outDim×inDim row-major;
 * `b` is length outDim (and fixes outDim). The Jacobian is the constant A.
 */
export function affine(A: ArrayLike<number>, b: ArrayLike<number>): SmoothMap {
  const outDim = b.length;
  const inDim = A.length / outDim;
  return {
    inDim,
    outDim,
    value(x, out) {
      for (let r = 0; r < outDim; r++) {
        let s = b[r];
        const row = r * inDim;
        for (let col = 0; col < inDim; col++) s += A[row + col] * x[col];
        out[r] = s;
      }
    },
    jacobian(_x, out) {
      for (let i = 0; i < A.length; i++) out[i] = A[i];
    },
  };
}

/**
 * Post-compose a smooth outer map g onto an `Fn` f → the `Fn` g∘f: value g(f(c)),
 * Jacobian Dg(f(c))·Df(c) (chain rule). Requires g.inDim === f.dim; result dim =
 * g.outDim. Composes left-to-right by nesting: postcompose(g2, postcompose(g1, f)).
 */
export function postcompose(g: SmoothMap, f: Fn, label = `${g.outDim}d∘${f.label}`): Fn {
  if (g.inDim !== f.dim) {
    throw new Error(`postcompose: g.inDim ${g.inDim} ≠ f.dim ${f.dim} (${f.label})`);
  }
  const k = g.outDim, mid = f.dim;
  const fVal = new Float64Array(mid);
  const gJac = new Float64Array(k * mid);
  let fJac: Float64Array | null = null;
  return {
    label,
    dim: k,
    value(c, out) {
      f.value(c, fVal);
      g.value(fVal, out);
    },
    jacobian(c, out) {
      const n = c.length;
      if (!fJac || fJac.length !== mid * n) fJac = new Float64Array(mid * n);
      f.value(c, fVal);
      f.jacobian(c, fJac);
      g.jacobian(fVal, gJac);
      // out[r·n + col] = Σ_m gJac[r·mid + m] · fJac[m·n + col]
      out.fill(0);
      for (let r = 0; r < k; r++) {
        const oRow = r * n, gRow = r * mid;
        for (let m = 0; m < mid; m++) {
          const grm = gJac[gRow + m];
          if (grm === 0) continue;
          const fRow = m * n;
          for (let col = 0; col < n; col++) out[oRow + col] += grm * fJac[fRow + col];
        }
      }
    },
  };
}
