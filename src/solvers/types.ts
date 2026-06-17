/**
 * The contracts the solvers consume — the problem-agnostic core.
 *
 * A solver (`project`, and later `flow`/`march`) is written against these
 * interfaces and knows nothing about a `Triangulation`. Problem data lives in the
 * IMPLEMENTATIONS, each in its own kind-folder: charts in `configuration/`,
 * constraints (closed conditions) in `submanifolds/`, energies/regions (open
 * conditions) in `regions/`. Every implementation depends on this module for its
 * contract; `solvers/` depends on none of them. That inversion is what makes the
 * solvers reusable across any problem.
 *
 * Pure: no three.js, no DOM.
 */

/**
 * A smooth map g : ℝⁿ → ℝᵏ on configuration space C (n = 3·V). Its zero set
 * {g = 0} is a closed submanifold; `project` drives g → 0. Differentiated IN C
 * (the ambient config); the solver pulls the derivative back through whatever
 * chart it runs in. A constraint captures whatever problem data it needs (e.g.
 * `flat` closes over the torus) — the solver never sees it.
 */
export interface ConstraintMap {
  readonly label: string;
  /** k = number of DRIVING rows (the Jacobian rows `project` steps with). May be
   *  the true codimension after dropping known-redundant rows (e.g. `flat`). */
  readonly codim: number;
  /** g(c) → `out` of length codim (the driving residual). */
  value(c: ArrayLike<number>, out: Float64Array): void;
  /** Dg → `out`, codim×n row-major (stride n). Analytic or finite-difference. */
  jacobian(c: ArrayLike<number>, out: Float64Array): void;
  /**
   * Honest convergence measure (‖·‖∞ of the FULL constraint, even the rows that
   * `codim` drops). Optional — defaults to ‖value‖∞. `flat` overrides it to the
   * full V-deficit max, because driving V−1 rows must NOT mean converging on only
   * V−1: the dropped deficit can lag above tol while the others are below it.
   */
  residual?(c: ArrayLike<number>): number;
}

/**
 * A parameterization ι : X = ℝᵈ → C = ℝⁿ of a subspace of configuration space,
 * with its derivative Dι. A solver runs ENTIRELY in the chart's coordinates X;
 * conditions are evaluated on the realized config ι(x) and their derivatives
 * pulled back through Dι. This is how linear conditions (pins, symmetry,
 * gauge-fixing) hold exactly by construction rather than by projection.
 *
 * Implementations live in `configuration/`. The current ones (`identity`,
 * `pinCoords`) are linear: Dι is a constant SELECTION matrix A (orthonormal
 * columns), which is exactly why the pullback reproduces newton's frozen-columns
 * behavior. General (nonlinear / non-orthonormal) parameterizations will need
 * Dι(x) and a min-norm-metric caveat.
 */
export interface Chart {
  /** dim X = number of free parameters. */
  readonly dim: number;
  /** dim C = ambient configuration dimension (= 3·vertexCount). */
  readonly ambient: number;
  /** ι : realize a full config from chart coordinates. */
  realize(x: ArrayLike<number>, outC: Float64Array): void;
  /** π : recover chart coordinates from a config (least-squares / selection). For seeds. */
  lift(c: ArrayLike<number>, outX: Float64Array): void;
  /** Pull a `rows`×n Jacobian (row-major, in C) back to `rows`×d (in X): J·Dι.
   *  Also used with `rows=1` to pull a C-gradient back to X (Aᵀ∇). */
  pullbackRows(jc: ArrayLike<number>, rows: number, outJx: Float64Array): void;
}

/**
 * A scalar potential E : C → ℝ that `flow` descends, with its gradient ∇E in C
 * (length n). Structurally the existing `math/energies` RepulsionEnergy, so those
 * energy factories are usable as `Energy` directly. `gradient` may mutate its
 * `Float64Array` input transiently (FD implementations) but must restore it.
 */
export interface Energy {
  readonly label: string;
  compute(c: ArrayLike<number>): number;
  gradient(c: Float64Array, out: Float64Array): void;   // ∇E in C
}

/**
 * An OPEN condition Ω (the "tiny open set" the search lives inside): a predicate
 * gate, a signed margin (diagnostic), and the two energies that move a config
 * w.r.t. it — `enterEnergy` (repulsion: reach Ω / push apart) and `stayEnergy`
 * (barrier: stay strictly inside / fatten). `contains` is the topological truth
 * (e.g. exactly `isEmbedded`), NOT `margin > 0`.
 */
export interface Region {
  readonly label: string;
  contains(c: ArrayLike<number>): boolean;   // the gate
  margin(c: ArrayLike<number>): number;      // signed depth — diagnostic only
  enterEnergy(): Energy;                      // repulsion
  stayEnergy(): Energy;                       // barrier
}
