/**
 * project — minimum-norm Gauss–Newton projection onto the intersection of
 * submanifolds ⋂{gᵢ = 0}, run entirely in a Chart's coordinates X.
 *
 * Problem-agnostic: it takes a `Chart` and abstract `ConstraintMap`s, NOT a
 * `Triangulation`. The torus (or any other problem data) lives inside the
 * constraints' closures; the chart owns the parameterization/gauge. This is the
 * generalization of `newtonFlatten`:
 *   - identity chart + [flat]                         ≡ newtonFlatten
 *   - pinCoords chart + [flat, collinear, collinear]  ≡ semiSolutionFlatten
 *
 * One step, given the current config c = ι(x):
 *   F  = stacked residuals gᵢ(c)                       (length K = Σ codim)
 *   Jc = stacked Jacobians Dgᵢ(c)                      (K × n, in C)
 *   Jx = Jc · Dι                                       (K × d, pulled back to X)
 *   (Jx Jxᵀ + λI) w = F                                (K × K normal equations)
 *   x ← x − Jxᵀ w                                      (min-norm step in X)
 *
 * One solver covers both rank regimes, because rank is the CONSTRAINT's business,
 * not the solver's. A constraint that knows its rank drops redundant DRIVING rows
 * itself (e.g. `flat` drops the Gauss–Bonnet row → full-rank, well-conditioned G)
 * while still measuring the full residual; the damping λ is then mere insurance
 * against thin-triangle ill-conditioning. A constraint that does NOT know its rank
 * may report dependent rows; then G is rank-deficient and λ carries the solve
 * harmlessly (a consistent residual is orthogonal to the null space).
 *
 * λ is added to the K×K matrix AFTER pullback — which is also what makes a pin
 * chart's step identical to newton's frozen-columns step (selection-matrix Dι).
 *
 * Mutates `x` (chart coordinates) in place. Pure: no three.js, no DOM.
 */

import { infNorm, solveDenseInPlace } from '../math/newton.ts';
import type { Chart, ConstraintMap } from './types.ts';

export type ProjectStatus = 'converged' | 'diverged' | 'max-iters';

export interface ProjectOptions {
  /** Stop when the convergence residual < tolerance. Default 1e-12. */
  tolerance?: number;
  /** Hard iteration cap. Default 50. */
  maxIters?: number;
  /** Tikhonov damping added to the K×K normal matrix. Default 1e-12. */
  damping?: number;
}

export interface ProjectResult {
  status: ProjectStatus;
  iters: number;
  residualNorm: number;
}

export function project(
  chart: Chart,
  x: Float64Array,
  constraints: readonly ConstraintMap[],
  opts: ProjectOptions = {},
): ProjectResult {
  const d = chart.dim;
  const n = chart.ambient;
  if (x.length !== d) {
    throw new Error(`project: expected ${d} chart coordinates, got ${x.length}`);
  }

  const tol = opts.tolerance ?? 1e-12;
  const maxIters = opts.maxIters ?? 50;
  const lambda = opts.damping ?? 1e-12;

  let K = 0;
  for (const cm of constraints) K += cm.codim;

  const c = new Float64Array(n);          // realized config ι(x)
  const F = new Float64Array(K);          // stacked residuals
  const Jc = new Float64Array(K * n);     // stacked Jacobians in C (stride n)
  const Jx = new Float64Array(K * d);     // pulled back to X (stride d)
  const aug = new Float64Array(K * (K + 1)); // [G + λI | F]
  const w = new Float64Array(K);

  // Residual at the current x: realize ι(x) into c, evaluate every constraint
  // into its slice of F (the driving residual the step uses). Convergence is the
  // max over each constraint's HONEST measure — `residual()` when given (e.g.
  // `flat` measures all V deficits though it drives V−1), else ‖value slice‖∞.
  const evalResidual = (): number => {
    chart.realize(x, c);
    let off = 0;
    let m = 0;
    for (const cm of constraints) {
      const slice = F.subarray(off, off + cm.codim);
      cm.value(c, slice);
      const r = cm.residual ? cm.residual(c) : infNorm(slice);
      if (r > m) m = r;
      off += cm.codim;
    }
    return m;
  };

  let curNorm = evalResidual();

  for (let iter = 0; iter <= maxIters; iter++) {
    if (curNorm < tol) return { status: 'converged', iters: iter, residualNorm: curNorm };
    if (!isFinite(curNorm) || curNorm > 1e8) return { status: 'diverged', iters: iter, residualNorm: curNorm };
    if (iter === maxIters) return { status: 'max-iters', iters: iter, residualNorm: curNorm };

    // Jacobians in C (c is current from the last evalResidual), then pull back.
    let off = 0;
    for (const cm of constraints) {
      cm.jacobian(c, Jc.subarray(off * n, (off + cm.codim) * n));
      off += cm.codim;
    }
    chart.pullbackRows(Jc, K, Jx);

    // aug = [G + λI | F], G = Jx Jxᵀ (K×K symmetric).
    const stride = K + 1;
    for (let i = 0; i < K; i++) {
      const ri = i * d;
      for (let j = i; j < K; j++) {
        const rj = j * d;
        let s = 0;
        for (let col = 0; col < d; col++) s += Jx[ri + col] * Jx[rj + col];
        aug[i * stride + j] = s;
        aug[j * stride + i] = s;
      }
      aug[i * stride + i] += lambda;
      aug[i * stride + K] = F[i];
    }

    if (!solveDenseInPlace(aug, w, K)) return { status: 'diverged', iters: iter, residualNorm: curNorm };

    // x ← x − Jxᵀ w  (min-norm step in chart coordinates).
    for (let col = 0; col < d; col++) {
      let s = 0;
      for (let i = 0; i < K; i++) s += Jx[i * d + col] * w[i];
      x[col] -= s;
    }

    curNorm = evalResidual();
  }

  return { status: 'max-iters', iters: maxIters, residualNorm: curNorm };
}
