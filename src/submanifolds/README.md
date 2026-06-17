# submanifolds/ — the closed conditions {g = 0}

Conditions you **project onto / march along**: smooth equality loci, each an `Fn`
from `functions/` (driven to zero by the solvers), optionally wrapped as a `Held`
to say how to use it (which rows to drive).

- `flat.ts` — the flatness submanifold (all cone-angle deficits = 0; codim V−1). A
  `Held`: `coneDeficit` driving V−1 rows (Gauss–Bonnet makes the V-th redundant).
- `collinear.ts` — a vertex triple collinear in the plane (for the semi-solution
  search), as an `fdFn`.
- `modulus.ts` — `fixedModulus` / `modulusWall`: post-compose the frozen Möbius
  (and an affine shift / take-Re) onto the `tau` map; the chain rule does the rest.
