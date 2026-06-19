/**
 * The algebra of differentiable maps (`Fn`s): build one from a value-only map by
 * finite differences (`fdFn`/`fdScalar`), from a value + analytic gradient (`scalarFn`)
 * or as an affine map (`affine`); chain two by the chain rule (`compose`); product them
 * (`stack`); or soften one into its least-squares energy (`leastSquares`).
 *
 * Everything here is an `Fn` — there is NO separate "smooth map" or "embedding" type.
 * A reparameterization φ : ℝⁿ → ℝ³ⱽ, a locus ℍ → ℝ, a Möbius chart ℝ²→ℝ², a constraint
 * and an energy are all `Fn`s, differing only in `inDim`/`outDim` and how they are used.
 *
 * `compose(outer, inner)` is the SINGLE chain-rule operation. It subsumes both "pull an
 * `Fn` through an inner reparameterization" (`g∘φ`, the `ConfigSpace` pullback) and
 * "post-compose an outer map onto an `Fn`" (`locus∘τ`, the modulus wall): those are the
 * same map composition, distinguished only by which argument is the reparameterization.
 * It returns a `ScalarFn` whenever the outer map is scalar (so the pulled energy keeps
 * its ergonomic `compute`/`grad`).
 *
 * NON-RE-ENTRANCY: the finite-difference and composition builders cache scratch buffers
 * reused across `jacobian`/`grad` calls, so a returned `Fn` is NOT re-entrant — its
 * `value`/`jacobian` must not, mid-call, re-enter the SAME `Fn`'s `jacobian`. The algebra
 * is strictly feed-forward (an inner map never re-enters its outer), so this holds; it is
 * the one invariant to preserve when extending this file.
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn, ScalarFn } from './types.ts';

const DEFAULT_H = 1e-7;

/**
 * Build an `Fn` from a value-only map by central finite differences: the returned
 * Jacobian is `outDim`×`inDim`, computed with 2·inDim evaluations of `value` over a
 * private scratch copy of the input (never mutated). The single place finite-differencing
 * lives — maps with a closed-form derivative supply their own `jacobian` instead.
 *
 * Step `h` defaults to 1e-7 (vs `fdScalar`'s 1e-6 — vector constraints want the tighter
 * step). The `scratch` buffer is reused across `jacobian` calls (see the module's
 * non-re-entrancy note).
 */
export function fdFn(
  label: string,
  inDim: number,
  outDim: number,
  value: (x: ArrayLike<number>, out: Float64Array) => void,
  h = DEFAULT_H,
): Fn {
  const scratch = new Float64Array(inDim);
  const vp = new Float64Array(outDim);
  const vm = new Float64Array(outDim);
  return {
    label,
    inDim,
    outDim,
    value,
    jacobian(x, out) {
      scratch.set(x);
      const inv2h = 1 / (2 * h);
      for (let col = 0; col < inDim; col++) {
        const saved = scratch[col];
        scratch[col] = saved + h; value(scratch, vp);
        scratch[col] = saved - h; value(scratch, vm);
        scratch[col] = saved;
        for (let r = 0; r < outDim; r++) out[r * inDim + col] = (vp[r] - vm[r]) * inv2h;
      }
    },
  };
}

/**
 * A scalar `Fn` (outDim 1) from a value and its analytic gradient. `value`/`jacobian`
 * are derived (`jacobian` is the single gradient row), so the map reads as `Fn`
 * everywhere while `flow`/`certify` use the ergonomic `compute`/`grad`.
 */
export function scalarFn(
  label: string,
  inDim: number,
  compute: (x: ArrayLike<number>) => number,
  grad: (x: ArrayLike<number>, out: Float64Array) => void,
): ScalarFn {
  return {
    label,
    inDim,
    outDim: 1,
    compute,
    grad,
    value(x, out) { out[0] = compute(x); },
    jacobian(x, out) { grad(x, out); },
  };
}

/**
 * A scalar `Fn` whose gradient is the central finite difference of `compute` (2·inDim
 * evaluations over a private scratch copy — the input is never mutated). For energies
 * with no closed-form gradient. Step `h` defaults to 1e-6; same reused-scratch
 * non-re-entrancy note as `fdFn`.
 */
export function fdScalar(
  label: string,
  inDim: number,
  compute: (x: ArrayLike<number>) => number,
  h = 1e-6,
): ScalarFn {
  const scratch = new Float64Array(inDim);
  return scalarFn(label, inDim, compute, (x, out) => {
    scratch.set(x);
    const inv2h = 1 / (2 * h);
    for (let i = 0; i < inDim; i++) {
      const saved = scratch[i];
      scratch[i] = saved + h; const ep = compute(scratch);
      scratch[i] = saved - h; const em = compute(scratch);
      scratch[i] = saved;
      out[i] = (ep - em) * inv2h;
    }
  });
}

/**
 * The least-squares ENERGY of a map: `½ Σ fn.value²`, a `ScalarFn` whose minimum is
 * exactly the zero set `{fn = 0}` and whose gradient is `Jᵀ·fn(x)` (the exact gradient
 * of ½‖f‖², not an approximation). This is the bridge from a CONDITION (an `Fn` you'd
 * Newton-solve with `project`) to the thing `flow` descends — "flow toward this
 * condition's zeros." Analytic whenever `fn.jacobian` is. Reused J/value scratch (see
 * the module's non-re-entrancy note).
 */
export function leastSquares(fn: Fn): ScalarFn {
  const k = fn.outDim, n = fn.inDim;
  const v = new Float64Array(k);
  const jac = new Float64Array(k * n);
  return scalarFn(
    `½‖${fn.label}‖²`,
    n,
    (x) => { fn.value(x, v); let s = 0; for (let r = 0; r < k; r++) s += v[r] * v[r]; return 0.5 * s; },
    (x, out) => {
      fn.value(x, v);
      fn.jacobian(x, jac);
      out.fill(0);
      for (let r = 0; r < k; r++) {            // ∇(½‖f‖²) = Jᵀ f
        const vr = v[r];
        if (vr === 0) continue;
        const row = r * n;
        for (let col = 0; col < n; col++) out[col] += jac[row + col] * vr;
      }
    },
  );
}

/**
 * The affine map x ↦ A·x + b, ℝ^inDim → ℝ^outDim, as an `Fn`. `A` is outDim×inDim
 * row-major; `b` is length outDim (and fixes outDim). The Jacobian is the constant A.
 */
export function affine(A: ArrayLike<number>, b: ArrayLike<number>, label = 'affine'): Fn {
  const outDim = b.length;
  if (A.length % outDim !== 0) {
    throw new Error(`affine: A length ${A.length} not a multiple of outDim ${outDim}`);
  }
  const inDim = A.length / outDim;
  return {
    label,
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
 * Compose two `Fn`s by the chain rule: `compose(outer, inner)` = `outer ∘ inner`, value
 * `outer(inner(x))`, Jacobian `D_outer(inner(x)) · D_inner(x)`. Requires
 * `outer.inDim === inner.outDim`; result has `inDim = inner.inDim`, `outDim = outer.outDim`.
 *
 * The one composition operation. As a PULLBACK it is `ConfigSpace.pull`: `compose(g, φ)`
 * turns an ambient measurement `g` into an `Fn` on the reduced space (inner = the
 * reparameterization φ). As a POST-MAP it stacks an outer map: `compose(locus, τ)` cuts
 * a locus out of ℍ (inner = the measurement τ). Same map composition either way. Returns
 * a `ScalarFn` when `outer` is scalar, so a pulled/post-composed energy keeps `compute`/`grad`.
 */
export function compose(outer: ScalarFn, inner: Fn, label?: string): ScalarFn;
export function compose(outer: Fn, inner: Fn, label?: string): Fn;
export function compose(outer: Fn, inner: Fn, label = `${outer.label}∘${inner.label}`): Fn {
  if (outer.inDim !== inner.outDim) {
    throw new Error(
      `compose: outer.inDim ${outer.inDim} ≠ inner.outDim ${inner.outDim} (${outer.label} ∘ ${inner.label})`,
    );
  }
  const inDim = inner.inDim, outDim = outer.outDim, mid = inner.outDim;
  const innerVal = new Float64Array(mid);
  const outerJac = new Float64Array(outDim * mid);
  const innerJac = new Float64Array(mid * inDim);
  const value = (x: ArrayLike<number>, out: Float64Array) => {
    inner.value(x, innerVal);
    outer.value(innerVal, out);
  };
  const jacobian = (x: ArrayLike<number>, out: Float64Array) => {
    inner.value(x, innerVal);
    inner.jacobian(x, innerJac);
    outer.jacobian(innerVal, outerJac);
    // out[r·inDim + col] = Σ_m outerJac[r·mid + m] · innerJac[m·inDim + col]
    out.fill(0);
    for (let r = 0; r < outDim; r++) {
      const oRow = r * inDim, gRow = r * mid;
      for (let m = 0; m < mid; m++) {
        const grm = outerJac[gRow + m];
        if (grm === 0) continue;
        const iRow = m * inDim;
        for (let col = 0; col < inDim; col++) out[oRow + col] += grm * innerJac[iRow + col];
      }
    }
  };
  if (outDim === 1) {
    const sOut = new Float64Array(1);
    // outer scalar ⟹ the result is a ScalarFn; its 1×inDim Jacobian IS the gradient.
    return scalarFn(label, inDim, (x) => { value(x, sOut); return sOut[0]; }, jacobian);
  }
  return { label, inDim, outDim, value, jacobian };
}

/**
 * Stack maps into ONE higher-dim `Fn` — the product of conditions `g = (f₁,…,f_m)`, with
 * `outDim = Σ fᵢ.outDim`. All must share the same `inDim` (the common domain). `value`/
 * `jacobian` write each block straight into `out.subarray(…)` at its row offset (no
 * copies). The zero set is the intersection ⋂{fᵢ = 0}; pair with `leastSquares` to flow
 * toward several conditions at once. Takes raw `Fn`s (maps), not `Constraint`s — the energy
 * path stacks bare maps (e.g. `coneDeficit`), independent of any constraint's `target`.
 */
export function stack(...fns: Fn[]): Fn {
  const inDim = fns[0].inDim;
  for (const f of fns) {
    if (f.inDim !== inDim) throw new Error(`stack: inDim ${f.inDim} ≠ ${inDim} (${f.label})`);
  }
  const outDim = fns.reduce((s, f) => s + f.outDim, 0);
  return {
    label: `stack(${fns.map((f) => f.label).join(',')})`,
    inDim,
    outDim,
    value(c, out) {
      let row = 0;
      for (const f of fns) { f.value(c, out.subarray(row, row + f.outDim)); row += f.outDim; }
    },
    jacobian(c, out) {
      const n = inDim;
      let row = 0;
      for (const f of fns) { f.jacobian(c, out.subarray(row * n, (row + f.outDim) * n)); row += f.outDim; }
    },
  };
}
