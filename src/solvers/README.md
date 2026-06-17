# solvers/ — the problem-agnostic numerical core

The methods that move a point: `project` (min-norm Gauss–Newton onto ⋂{gᵢ=0}), and
later `flow` (projected gradient descent) and `march` (continuation). They operate on
the abstract contracts in `types.ts` (`ConstraintMap`, `Chart`, …) and know **nothing**
about a `Triangulation` — problem data lives in the implementations elsewhere
(`configuration/`, `submanifolds/`, `regions/`), each of which depends on this module
for its contract. `solvers/` depends on none of them.

- `types.ts` — the contracts every condition/chart implements.
- `project.ts` — projection onto a submanifold intersection, in chart coordinates.

(Reuses the pure `solveDenseInPlace`/`infNorm` from `math/newton.ts` for now; those
move here during the refactor.)
