# constraints/ — the closed conditions {g = 0}

The **closed** conditions: submanifolds you *project onto*. Each is a differentiable
map `Fn` driven to zero (a `Constraint` — a bare `Fn`, or an `Fn` + `Held` usage
saying which rows to drive); `project`/`march` consume them. Each module is
self-contained — its *measurement* (an `Fn`/`ScalarFn` built from the `functions/`
toolkit) and its *usage* (the constraint) — and downstream (`certify`, the viewer)
imports the measurement straight from the module.

- `types.ts` — the `Held`/`Constraint` contracts.
- `flat.ts` — the cone-angle deficit measurement + the `flat` constraint (drive V−1).
- `collinear.ts` — the planar signed-area measurement (analytic) + the constraint.
- `modulus.ts` — the modulus as a **chart × locus grid**: `pinTeichmuller`/`pinModuli` ×
  `point`/`verticalLine`/`circle`, each `compose(locus, chart∘tau)` (fully analytic — `tau`'s
  Jacobian comes from `moduli/modulus`); named cells `fixedModulus`/`modulusWall`. Consumes `moduli/`.

The other species of condition — the **open** region you *stay inside* — is
embeddedness, and it has its own first-class home in `embedding/` (gated by a `Gate`
predicate in `flow`/`march`, plus the repulsion energies that drive a config into it). The
search is exactly "land on these closed constraints while staying inside that open
region."

`functions/` (the toolkit) + `topology/` + `geometry/` are below; the solvers consume
these via the abstract `Constraint` contract. Pure: no three.js, no DOM.
