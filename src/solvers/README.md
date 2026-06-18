# solvers/ — the problem-agnostic numerical core

The methods that move a point, run **entirely on the problem's space ℝⁿ**: `project`
(min-norm Gauss–Newton onto ⋂{gᵢ=0}), `flow` (Riemannian gradient descent along the
manifold, gated to stay in a region), and `march` (continuation tracking a family ∩
region). They take constraints already *pulled* into ℝⁿ and a `Gate` predicate, and
know **nothing** about a `Triangulation`, an `Embedding`, or a chart — that's what
makes a toy test just "ℝⁿ + some functions". `solvers/` depends on no implementation.

- `types.ts` — the one solver-side contract: `Gate`, a predicate on ℝⁿ (the runtime
  form of an open region). The condition contracts live below: `Held`/`Constraint` in
  `constraints/types.ts`; the open embedded region is just its `isEmbedded` gate
  (`embedding/embedded.ts`), pulled to a `Gate`. There is no separate
  constraint *or energy* interface — a constraint IS an `Fn` driven to zero, an energy
  IS a scalar `Fn` descended (`flow` takes a `ScalarFn`).
- `held.ts` — normalize a `Constraint` (bare `Fn` or `Fn`+usage) into the driven-rows
  form the steppers stack.
- `project.ts` / `flow.ts` / `march.ts` / `tangentProject.ts` — the steppers, all on
  one J-hub (the held Jacobian's damped JJᵀ solve).
- `linalg.ts` — the dense normal-equation solve + ‖·‖∞, the solver core's only numerics.
