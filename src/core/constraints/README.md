# constraints/ — the closed conditions {g = 0}

The **closed** conditions: submanifolds you *project onto*. Each is a differentiable map `Fn`
driven to zero — that's all a `Constraint` is, a bare `Fn` (no usage wrapper); the solvers drive
every row. A constraint that is rank-deficient by construction states its rank at the source by
emitting only its independent rows. Each module is self-contained — its *measurement* (an
`Fn`/`ScalarFn` built from the `functions/` toolkit) and its *constraint* form — and downstream
(`certify`, the viewer) imports the measurement straight from the module.

- `types.ts` — the `Constraint` contract (`= Fn`).
- `flat.ts` — the cone-angle deficit measurement + the `flat` constraint (emits the V−1
  independent rows; Gauss–Bonnet makes the V-th redundant).
- `collinear.ts` — the planar signed-area measurement (analytic) + the constraint.
- `modulus.ts` — the modulus as a **chart × locus grid**: `pinTeichmuller`/`pinModuli` ×
  `point`/`verticalLine`/`circle`, each `compose(locus, chart∘tau)` (fully analytic — `tau`'s
  Jacobian comes from `moduli/modulus`); named cells `fixedModulus`/`modulusWall`. Consumes `moduli/`.

The other species of condition — the **open** region you *stay inside* — is
embeddedness, and it has its own first-class home in `embedding/` (the `Region` contract that
`minimize`/`continuation` stay inside, plus the repulsion energies that drive a config into it). The
search is exactly "land on these closed constraints while staying inside that open
region."

`functions/` (the toolkit) + `topology/` + `geometry/` are below; the solvers consume
these via the abstract `Constraint` contract. Pure: no three.js, no DOM.
