# functions/ — the differentiable-map toolkit

Pure machinery, no torus content: what a differentiable map **is**, and how to build and
combine them. The generic layer that `constraints/` + `embedding/` (and the coordinate
systems, the modulus loci, …) build their concrete maps from — the same machinery-vs-instances
split as `topology/` (generic) ↔ `triangulations/` (data).

- `types.ts` — **`Fn`**: the ONE object, a differentiable map ℝⁿ → ℝᵏ carrying its own
  Jacobian (`label` + `inDim` + `outDim` + `value` + `jacobian`). Every condition, energy,
  coordinate change φ, locus, and chart is an `Fn` — there is no separate "smooth map" or
  "embedding" type, only `inDim`/`outDim` and role. `ScalarFn` is just an `Fn` at `outDim 1`
  with the conveniences `compute`/`grad`.
- `compose.ts` — the algebra:
  - `fdFn`/`fdScalar` (finite-difference a value-only map into an `Fn`), `scalarFn` (a scalar
    `Fn` from value + analytic gradient), `affine` (x ↦ A·x + b);
  - **`compose(outer, inner)`** — the single chain-rule operation `outer ∘ inner`. It is BOTH
    the pullback `g∘φ` (`ConfigSpace.pull`, inner = a reparameterization) AND the post-map
    `locus∘τ` (the modulus wall, inner = a measurement): the same composition, distinguished
    only by which argument reparameterizes. Returns a `ScalarFn` when `outer` is scalar;
  - **`stack`** — combine conditions into one higher-dim `Fn` (the product; its zero set is the
    intersection; all must share `inDim`);
  - **`leastSquares`** — soften a condition into the `½‖·‖²` energy whose descent reaches
    `{fn = 0}` (exact gradient `Jᵀf`, analytic whenever the map is).

So a condition is one `Fn` with three verbs: **solve it hard** (`project`/`march`), **combine**
it (`stack`), or **soften** it for gradient flow (`leastSquares` → `flow`); `compose` chains any
two maps. The finite-difference/composition builders cache reused scratch, so the returned `Fn`s
are **not re-entrant** (an inner map must not re-enter its outer's `jacobian` mid-call) — the
algebra is feed-forward, so this holds.

The concrete maps (cone-angle deficit, τ, the loci, cell gaps, the energies) live with the
conditions they define — the closed ones in `constraints/`, the embedded region in `embedding/`,
the coordinate maps φ in `coordinates/`.
