/**
 * `Fn` — a differentiable map ℝⁿ → ℝᵏ carrying its own Jacobian. THE one map object the
 * whole system is built from: the map behind every condition, energy, coordinate change,
 * locus, and chart is an `Fn`. (The canonical instance is a map of a configuration
 * C = ℝ³ⱽ, so n = 3V — but `Fn` is generic: a reparameterization φ : ℝⁿ → ℝ³ⱽ, a locus
 * ℍ → ℝ, a Möbius chart ℝ²→ℝ² are all `Fn`s, distinguished only by `inDim`/`outDim` and role.)
 *
 * An `Fn` is used several ways, and the `functions/compose` algebra is what moves between
 * them: pair it with a `target` into a `Constraint` and `project`/`continuation` solve it
 * HARD (drive `fn − target` to zero); `leastSquares(fn)` turns it into the `ScalarFn` energy
 * `minimize` descends SOFT (move toward its zeros); `stack(...)` combines maps into one
 * higher-dim `Fn`; `compose(g, f)` chains two `Fn`s by the chain rule (so the pullback `g∘φ`
 * and the post-map `locus∘τ` are the same operation). So "constraint"/"energy"/"coordinate
 * map" are ROLES — a `Constraint` is a thin `{fn, target}` over an `Fn`, an energy a
 * `ScalarFn` — not separate map types.
 *
 * `value` writes the `outDim` components; `jacobian` writes the `outDim`×`inDim`
 * derivative, row-major with stride `inDim`. Both take the input as `ArrayLike` so they
 * can be evaluated on staging buffers; neither mutates it.
 *
 * Pure: no three.js, no DOM.
 */
export interface Fn {
  readonly label: string;
  /** n — the domain dimension (the length of the input the map reads). */
  readonly inDim: number;
  /** k — the codomain dimension (the length `value` writes). */
  readonly outDim: number;
  /** g(x) → `out`, length `outDim`. */
  value(x: ArrayLike<number>, out: Float64Array): void;
  /** Dg(x) → `out`, `outDim`×`inDim` row-major (stride `inDim`). */
  jacobian(x: ArrayLike<number>, out: Float64Array): void;
}

/**
 * A scalar `Fn` (outDim = 1) — the shape an energy or a margin takes. Not a separate
 * concept: just an `Fn` at outDim 1 with two conveniences — `compute` (the scalar
 * value) and `grad` (its gradient ∇g, i.e. the single Jacobian row). `flow` descends
 * one of these; `certify` reads one as a diagnostic. "Energy" is then a *role* a
 * `ScalarFn` plays, not its own interface.
 */
export interface ScalarFn extends Fn {
  readonly outDim: 1;
  /** The scalar value g(x) = value(x)[0]. */
  compute(x: ArrayLike<number>): number;
  /** ∇g(x) → `out` (length inDim); the single Jacobian row. */
  grad(x: ArrayLike<number>, out: Float64Array): void;
}
