# submanifolds/ — the closed conditions {g = 0}

Conditions you **project onto / march along**: smooth equality loci, each a
`ConstraintMap` (contract in `solvers/types.ts`) built from a function in `functions/`.

- `flat.ts` — the flatness submanifold (all cone-angle deficits = 0; codim V−1).
- `collinear.ts` — a vertex triple collinear in the plane (for the semi-solution search).

To come during the refactor: `fixedModulus` / `modulusWall` (built on the τ map).
