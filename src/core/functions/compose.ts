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

import type { Fn, ScalarFn } from './types.ts';

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

/**
 * An `Embedding` is a `SmoothMap` φ : ℝⁿ → ℝᵐ used as the inner reparameterization
 * that DEFINES a configuration space — the φ in `ConfigSpace = (T, φ)`. Structurally
 * identical to `SmoothMap` (value + Jacobian); the alias carries one expectation a
 * general smooth map need not satisfy: φ is an IMMERSION (`Dφ` has full column rank,
 * `inDim ≤ outDim`), which is exactly the condition for the pullback metric `DφᵀDφ`
 * to be nondegenerate. The numerics never assume the immersion property — it is the
 * contract under which the *metric* is meaningful. See docs/math/configuration-space.md.
 */
export type Embedding = SmoothMap;

const DEFAULT_H = 1e-7;

/**
 * Build an `Fn` from a value-only map by central finite differences: the
 * returned Jacobian is k×n, computed with 2n evaluations of `value` over a
 * private scratch copy of the config (the input is never mutated). The single
 * place finite-differencing lives — maps with a closed-form derivative supply
 * their own `jacobian` instead.
 *
 * Step `h` defaults to 1e-7 (vs `fdScalar`'s 1e-6 — vector constraints want the
 * tighter step). The `scratch` buffer is reused across `jacobian` calls, so this
 * is NOT re-entrant: `value` must not itself evaluate this same `Fn`'s `jacobian`
 * (no fd-map currently nests, so it holds).
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
 * A scalar `Fn` (dim 1) from a value and its analytic gradient. `value`/`jacobian`
 * are derived (`jacobian` is the single gradient row), so the map reads as `Fn`
 * everywhere while `flow`/`certify` use the ergonomic `compute`/`grad`.
 */
export function scalarFn(
  label: string,
  compute: (c: ArrayLike<number>) => number,
  grad: (c: ArrayLike<number>, out: Float64Array) => void,
): ScalarFn {
  return {
    label,
    dim: 1,
    compute,
    grad,
    value(c, out) { out[0] = compute(c); },
    jacobian(c, out) { grad(c, out); },
  };
}

/**
 * A scalar `Fn` whose gradient is the central finite difference of `compute`
 * (2n evaluations over a private scratch copy — the input is never mutated, unlike
 * the old in-place `fdGradient`). For energies with no closed-form gradient. Step
 * `h` defaults to 1e-6; same reused-scratch non-re-entrancy caveat as `fdFn`.
 */
export function fdScalar(
  label: string,
  compute: (c: ArrayLike<number>) => number,
  h = 1e-6,
): ScalarFn {
  let scratch: Float64Array | null = null;
  return scalarFn(label, compute, (c, out) => {
    const n = c.length;
    if (!scratch || scratch.length !== n) scratch = new Float64Array(n);
    scratch.set(c);
    const inv2h = 1 / (2 * h);
    for (let i = 0; i < n; i++) {
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
 * exactly the zero set `{fn = 0}` and whose gradient is `Jᵀ·fn(c)`. This is the bridge
 * from a CONDITION (an `Fn` you'd Newton-solve with `project`) to the thing `flow`
 * descends — "flow toward this condition's zeros." The third `ScalarFn` producer
 * (analytic `scalarFn` / finite-diff `fdScalar` / least-squares-of-a-map). Analytic
 * whenever `fn.jacobian` is. The reused J/value scratch makes it non-re-entrant (same
 * caveat as `fdScalar`).
 */
export function leastSquares(fn: Fn): ScalarFn {
  const k = fn.dim;
  const v = new Float64Array(k);
  let jac: Float64Array | null = null;
  return scalarFn(
    `½‖${fn.label}‖²`,
    (c) => { fn.value(c, v); let s = 0; for (let r = 0; r < k; r++) s += v[r] * v[r]; return 0.5 * s; },
    (c, out) => {
      const n = c.length;
      if (!jac || jac.length !== k * n) jac = new Float64Array(k * n);
      fn.value(c, v);
      fn.jacobian(c, jac);
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

/**
 * Pre-compose an `Fn` `f` with an inner `Embedding` φ → the `Fn` `f∘φ` on φ's domain:
 * value `f(φ(x))`, Jacobian `Df(φ(x))·Dφ(x)` (chain rule). This is the PULLBACK
 * `φ*f` — the dual of `postcompose` (there the `Fn` is the *inner* map; here it is the
 * *outer*). It is exactly `ConfigSpace.pull(f)`: turn an ambient measurement
 * `f : ℝ^{outDim} → ℝᵏ` into a genuine `Fn` on the restricted space `ℝ^{inDim}`.
 *
 * `f`'s domain dimension is implicit (an `Fn` reads a config of whatever length it is
 * handed), so φ.outDim MUST equal the length `f` expects — there is no static field to
 * check it against; mismatch surfaces as an out-of-range Jacobian write. Result dim =
 * f.dim, domain dim = φ.inDim.
 */
export function precompose(f: Fn, phi: Embedding, label = `${f.label}∘${phi.inDim}d`): Fn {
  const k = f.dim, m = phi.outDim, n = phi.inDim;
  const p = new Float64Array(m);          // φ(x)
  const fJac = new Float64Array(k * m);   // Df at φ(x)
  let phiJac: Float64Array | null = null;
  return {
    label,
    dim: k,
    value(x, out) {
      phi.value(x, p);
      f.value(p, out);
    },
    jacobian(x, out) {
      if (!phiJac || phiJac.length !== m * n) phiJac = new Float64Array(m * n);
      phi.value(x, p);
      f.jacobian(p, fJac);
      phi.jacobian(x, phiJac);
      // out[r·n + col] = Σ_s fJac[r·m + s] · phiJac[s·n + col]
      out.fill(0);
      for (let r = 0; r < k; r++) {
        const oRow = r * n, fRow = r * m;
        for (let s = 0; s < m; s++) {
          const frs = fJac[fRow + s];
          if (frs === 0) continue;
          const pRow = s * n;
          for (let col = 0; col < n; col++) out[oRow + col] += frs * phiJac[pRow + col];
        }
      }
    },
  };
}

/**
 * `precompose` for a scalar — `ScalarFn` in, `ScalarFn` out, so the energy keeps its
 * ergonomic `compute`/`grad`. The pulled gradient is `∇(f∘φ) = Dφᵀ·∇f(φ(x))` (length
 * φ.inDim). Same contract as `precompose` on φ.outDim.
 */
export function precomposeScalar(f: ScalarFn, phi: Embedding, label = `${f.label}∘${phi.inDim}d`): ScalarFn {
  const m = phi.outDim, n = phi.inDim;
  const p = new Float64Array(m);          // φ(x)
  const gradM = new Float64Array(m);      // ∇f at φ(x)
  let phiJac: Float64Array | null = null;
  return scalarFn(
    label,
    (x) => { phi.value(x, p); return f.compute(p); },
    (x, out) => {
      if (!phiJac || phiJac.length !== m * n) phiJac = new Float64Array(m * n);
      phi.value(x, p);
      f.grad(p, gradM);
      phi.jacobian(x, phiJac);
      // out[col] = Σ_s gradM[s] · phiJac[s·n + col]   (= Dφᵀ ∇f)
      out.fill(0);
      for (let s = 0; s < m; s++) {
        const gs = gradM[s];
        if (gs === 0) continue;
        const pRow = s * n;
        for (let col = 0; col < n; col++) out[col] += gs * phiJac[pRow + col];
      }
    },
  );
}

/**
 * Stack maps into ONE higher-dim `Fn` — the product of conditions `g = (f₁,…,f_m)`, with
 * `dim = Σ fᵢ.dim`. `value`/`jacobian` write each block straight into `out.subarray(…)` at
 * its row offset (no copies). The zero set is the intersection ⋂{fᵢ = 0}; pair with
 * `leastSquares` to flow toward several conditions at once. Takes raw `Fn`s — a `Held`'s
 * `drive`/`measure` is a `project`-only concern (`stack` for the energy path uses the bare
 * map, e.g. `coneDeficit`, not the `flat` `Held`).
 */
export function stack(...fns: Fn[]): Fn {
  const dim = fns.reduce((s, f) => s + f.dim, 0);
  return {
    label: `stack(${fns.map((f) => f.label).join(',')})`,
    dim,
    value(c, out) {
      let row = 0;
      for (const f of fns) { f.value(c, out.subarray(row, row + f.dim)); row += f.dim; }
    },
    jacobian(c, out) {
      const n = c.length;
      let row = 0;
      for (const f of fns) { f.jacobian(c, out.subarray(row * n, (row + f.dim) * n)); row += f.dim; }
    },
  };
}
