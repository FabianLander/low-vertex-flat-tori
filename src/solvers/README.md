# solvers/ — the problem-agnostic numerical core

The methods that move a point: `project` (min-norm Gauss–Newton onto ⋂{gᵢ=0}),
`flow` (Riemannian gradient descent along the manifold, into a region), and `march`
(continuation tracking a family ∩ region). They operate on abstract contracts and
know **nothing** about a `Triangulation` — problem data lives in the implementations
(`functions/`, `configuration/`, `submanifolds/`, `regions/`), each depending on this
module for its contract; `solvers/` depends on no implementation.

- `types.ts` — the contracts the solvers consume: `Chart`, `Region`, and
  `Held`/`Constraint` (a `Fn` from `functions/` plus how to use it). There is no
  separate constraint *or energy* interface — a constraint IS an `Fn` driven to zero,
  an energy IS a scalar `Fn` descended (`flow` takes a `ScalarFn`).
- `held.ts` — normalize a `Constraint` (bare `Fn` or `Fn`+usage) into the driven-rows
  form the steppers stack.
- `project.ts` / `flow.ts` / `march.ts` / `tangentProject.ts` — the steppers, all on
  one J-hub (the held Jacobian's damped JJᵀ solve).

- `linalg.ts` — the dense normal-equation solve + ‖·‖∞, extracted from `math/newton`; the solver core now depends on nothing in `math/`.
