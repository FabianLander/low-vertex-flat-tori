# constraints/ — the closed conditions {g = 0}

The **closed** conditions: level sets `{fn(x) = target}` you *project onto*. A `Constraint` is a
*function equated to a value* — a map `fn` (an `Fn`, from the `functions/` toolkit) paired with the
`target` the solvers drive it to (`target` absent ⟺ 0); the solvers drive every row of `fn − target`.
A bare `Fn` is a MAP, not a constraint — the sharpened line `coneDeficit` (map) vs `flat`
(constraint). A constraint rank-deficient by construction states its rank at the source by emitting
only its independent rows in `fn`. Each module owns its *measurement* (the `Fn`) and its *constraint*
form; downstream (`measure`, the viewer) imports the measurement straight from the module.

- `types.ts` — the `Constraint` contract (`{ fn: Fn; target?: ArrayLike<number> }`).
- `flat.ts` — the cone-angle deficit measurement (`coneDeficit`, a bare map) + the `flat` constraint
  (its `fn` emits the V−1 independent rows; Gauss–Bonnet makes the V-th redundant; target 0).
- `collinear.ts` — the planar signed-area measurement (analytic) + the `collinear` constraint (target 0).
- `modulus.ts` — the modulus as a **chart × locus grid**: `pinTeichmuller`/`pinModuli` ×
  `point`/`verticalLine`/`circle`. A locus is itself a `Constraint`, but on ℍ (a measurement of τ = a
  target value); pinning pulls its `fn` back through `chart∘tau` and carries the target through —
  `{ fn: compose(locus.fn, chart∘tau), target: locus.target }`, fully analytic (`tau`'s Jacobian from
  `moduli/modulus`). Named cells `fixedModulus`/`modulusWall`. Consumes `moduli/`.

The other species of condition — the **open** region you *stay inside* — is
embeddedness, and it has its own first-class home in `embedding/` (the `Region` contract that
`minimize`/`continuation` stay inside, plus the repulsion energies that drive a config into it). The
search is exactly "land on these closed constraints while staying inside that open
region."

`functions/` (the toolkit) + `topology/` + `geometry/` are below; the solvers consume
these via the abstract `Constraint` contract. Pure: no three.js, no DOM.
