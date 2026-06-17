/**
 * `Fn` — a differentiable map of the configuration, C = ℝⁿ → ℝᵏ (n = 3·V).
 *
 * This is the ONE concept the search system is built from. A closed condition (a
 * submanifold {g = 0}) is an `Fn` driven to zero; an open condition's potential
 * (an energy) is a scalar `Fn` pushed downhill; a certificate or diagnostic just
 * reads an `Fn`'s value. The maps live here, in `functions/`, separate from the
 * loci and energies they define — because each is measured in many roles, and the
 * map is the shared thing.
 *
 * `value` writes the k components; `jacobian` writes the k×n derivative, row-major
 * with stride n. Both take the config as `ArrayLike` so they can be evaluated on
 * staging buffers; neither mutates it.
 *
 * Pure: no three.js, no DOM.
 */
export interface Fn {
  readonly label: string;
  /** k — the codomain dimension. */
  readonly dim: number;
  /** g(c) → `out`, length `dim`. */
  value(c: ArrayLike<number>, out: Float64Array): void;
  /** Dg(c) → `out`, `dim`×n row-major (stride n). */
  jacobian(c: ArrayLike<number>, out: Float64Array): void;
}

/**
 * A scalar `Fn` (dim = 1) — the shape an energy or a margin takes. Not a separate
 * concept: just an `Fn` at dim 1 with two conveniences — `compute` (the scalar
 * value) and `grad` (its gradient ∇E in C, i.e. the single Jacobian row). `flow`
 * descends one of these; `certify` reads one as a diagnostic. "Energy" is then a
 * *role* a `ScalarFn` plays, not its own interface.
 */
export interface ScalarFn extends Fn {
  readonly dim: 1;
  /** The scalar value g(c) = value(c)[0]. */
  compute(c: ArrayLike<number>): number;
  /** ∇g(c) in C → `out` (length n); the single Jacobian row. */
  grad(c: ArrayLike<number>, out: Float64Array): void;
}
