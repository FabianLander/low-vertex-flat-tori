# Plan: `Constraint = { fn, target }` — a function set equal to a value

## The decision

A constraint is a **function equated to a value** — a level set `{ fn(x) = target }`. Make that the
type, explicitly:

```ts
// constraints/types.ts
type Constraint = { fn: Fn; target?: ArrayLike<number> };   // drive fn(x) → target
```

- `target` is length `fn.outDim`; **absent ⟺ the zero vector** (an ordinary optional-field default
  on an explicit record — not a coercion).
- **A bare `Fn` is a MAP, not a `Constraint`.** No `Fn | {...}` union, no magic. Maps
  (`coneDeficit`, `collinear`, `tau`, the locus measurements) stay `Fn`s and feed
  `stack`/`leastSquares`/`compose`. A constraint *pairs* a map with a target.
- This sharpens the map ↔ constraint distinction that `coneDeficit` (map) vs `flat` (constraint)
  already embodies; it becomes the rule.

The solver drives `fn(x) − target → 0`. The Jacobian is `∂fn/∂x` (the constant `target` doesn't
enter), so the QR step / tangent projection / convergence are unchanged — `target` only shifts the
residual. `compose` is untouched: a constraint's `fn` is built by composing pure maps as now, and
`target` is attached at the outermost (constraint-construction) step — it never threads through
`compose`.

## Stage A — the mechanism (mechanical, behavior-preserving, ~30 min)

Everything keeps targeting 0 (the modulus pins still bake their shift into `fn`), so **no behavior
changes** — all 213 tests + the 5 scripts stay green, or something visible broke.

- **`constraints/types.ts`** — the record type above (~6 lines).
- **`solvers/project.ts`** — `K = Σ c.fn.outDim`; in `evalResidual`, `c.fn.value(x, F.sub)` then
  `if (c.target) F[off+i] -= c.target[i]`; the Jacobian loop uses `c.fn.jacobian`. (~8 lines)
- **`solvers/minimize.ts`** — `K = Σ c.fn.outDim`; `heldJac` uses `c.fn.jacobian`. (no `target` —
  `project` does the retract/residual). (~3 lines)
- **`solvers/continuation.ts`** — none (delegates to `project`; the `Family.held` return type just
  becomes `Constraint[]`).
- **`search/pull.ts`** — `pullHeld`: `held.map(c => ({ fn: space.pull(c.fn), target: c.target }))`. (~3 lines)
- **`constraints/flat.ts`** — `flat(triang)` returns `{ fn: <the V−1 Fn> }` (target omitted). (~1 line)
- **`constraints/modulus.ts`** — the pins return records, target 0 for now: `pinTeichmuller` →
  `{ fn: compose(locus, tau), target: undefined }`, similarly `pinModuli`/`fixedModulus`/`modulusWall`
  (the shift stays inside the locus `Fn` — unchanged behavior). (~6 lines)
- **bare-map constraint sites** — where a *map* is dropped straight into a held list, wrap it:
  - `search/semiSolution.ts`: `{ fn: collinear(1,2,3,n) }`, `{ fn: collinear(4,5,6,n) }`.
  - tests: `project.test` (the two `collinear`s), `continuation.test` toy family (`{fn: circle}`,
    `{fn: xCoord(s)}`), `minimize.test` (`{ fn: sphere }`).
  - `flat(...)`/`modulusWall(...)`/`fixedModulus(...)` already return records ⟹ held lists like
    `[flat(t), modulusWall(t, c)]` are unchanged at the call site.

Verify: `tsc` + full `vitest` green + the 5 scripts run.

## Stage B — modulus uses the target (the payoff, ~45–60 min, one design choice)

Move the target out of the locus `Fn` into the `Constraint.target`, so `verticalLine`/`point` read as
"measurement = value". Still behavior-preserving (identical level sets; the modulus grid test pins it).

- A locus becomes a **{ measure: Fn (ℍ→ℝᵏ), target }** descriptor instead of a shifted `Fn`:
  - `point(z₀)` → `{ measure: id₂, target: z₀ }`
  - `verticalLine(c)` → `{ measure: takeRe (ℝ²→ℝ¹), target: [c] }`
  - `circle(center, r)` → `{ measure: |·−center|² (ℝ²→ℝ¹), target: [r²] }`  *(center stays in the map)*
- the pins compose the measure and pass the target through:
  - `pinTeichmuller(t, locus)` → `{ fn: compose(locus.measure, tau(t)), target: locus.target }`
  - `pinModuli(t, seed, locus)` → `{ fn: compose(locus.measure, compose(mobius(m), tau(t))), target: locus.target }`
  - `fixedModulus` / `modulusWall` unchanged at their call sites (they build via the pins).
- small helper maps: `takeRe = affine([1,0],[0])`, `id₂ = affine([1,0,0,1],[0,0])`, and the
  squared-distance `|·−center|²`.
- update `modulus.test` (constraints are records; `jacVsFd` reads `c.fn`).

Verify: `tsc` + full `vitest` (modulus grid + `capstone` pin the same tori) + scripts.

## Contract & scope

- **Behavior-preserving throughout.** Every constraint's zero set is identical (`fn − target = 0` ⟺
  the old shifted `fn = 0`). If a modulus/`capstone`/script result changes, STOP — don't adjust tests
  to pass.
- **Stage A first, verified green, before Stage B** — A is purely mechanical; B has the one design
  choice (the locus `{measure, target}` shape).
- Out of scope (later, separate): wiring continuation `Family`s to express their constraint as a
  swept `target` (only a clean win for globally-smooth charts; moduli walls re-freeze the chart per
  step regardless — see docs/solvers-overhaul.md).
