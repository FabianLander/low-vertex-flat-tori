# Plan: a modular constrained-search system for tori

> **Status: proposed** — approved design, not yet implemented.

## Context

We search the configuration space of a triangulated torus (vertex positions in ℝ³ᵛ)
for tori satisfying combinations of geometric conditions, and we care where each lands
in moduli space. Today this lives in ~8 near-identical headless scripts
(`search-near-rect`, `sample-rect`, `collect-rect`, `wall-ladder`, `push-re`,
`polish-rect`, `filter-wall`, `sample-flat`) that each re-implement arg parsing, RNG,
seed loading, the normalize→reflatten→re-measure certificate, and a report/SIGINT loop —
and each **hard-codes one notion of target**. A prior plan (`eager-questing-wigderson.md`)
proposed unifying this but **only around modulus targets** — it has no concept of
*configuration-space* constraints (pin vertices, symmetry, gauge), which is central to
where this project is going.

The goal: a small, legible kit that lets us write a search as a **composition of
geometric conditions** instead of a new script. The design was worked out in detail with
the user; this plan makes it concrete against the real APIs.

### The kit (the players)

A geometric condition shapes the search in one of **three** ways, and which way it is is
decided by its math, not by taste:

1. **Parametrically — the SearchSpace.** A general tool: the space the search actually
   runs in, given by a parameterization — a coordinate space `X` with a smooth map
   `ι : X → ℝ³ᵛ` realizing each point as a full torus (plus a lift `π : ℝ³ᵛ → X` for seeds).
   It privileges nothing; the default is the identity (`X = ℝ³ᵛ`, the full config space).
   Non-trivial instances are just constructions: *linear* conditions with a closed-form
   parameterization (reflection/rotation symmetry, vertex pins, plane membership) **shrink
   the variables** and hold **exactly by construction, never projected** — a reflection
   search becomes a genuine 12-dim search, not a 24-dim one projected onto an approximate
   symmetric submanifold — or a hand-written formula/ansatz `ι`. All are SearchSpaces; the
   tool treats them uniformly.
2. **Implicitly, as an equality** — *nonlinear* conditions (flatness, a target modulus)
   have no closed form; you land on `{g = 0}` with Newton. These are **Constraint**s.
3. **As an open region** — possibly non-smooth conditions you can't land on
   (embeddedness, non-degeneracy). You gate / barrier / enter them. These are **Region**s.

| Player | Role | Maps to existing code |
|---|---|---|
| **Torus / positions** | the data | `Torus` (`src/tori`), `Float64Array` (`PaperTorus`) |
| **SearchSpace** | general: the parameterized coordinate space the search runs in + map `ι` to full config; default identity | new; symmetry instance uses `Torus.symmetryPairing` |
| **Constraint** (equality) | nonlinear, smooth; you *project / flow onto* `{g=0}` | wraps `NewtonConstraint` |
| **Region** (open condition) | inequality, possibly non-smooth; gate / barrier / enter — never Newton onto | wraps `isEmbedded` + `minMargin` + energies |
| **Energy** | a potential you descend | **reuse `RepulsionEnergy`** (`energies/types.ts`) |
| **SeedSource** | a stream of starting configs (formula / cloud / CSV / reference) | new; today hand-rolled |
| **Outcome** | a config + certificate + status + **diagnostics** | new; today ad-hoc CSV rows |
| **Operation** | the verbs: project / flowToward / march / fatten / walk / certify | wraps `newtonFlatten`, `embeddedFlow`, `perturb` |
| **Driver/runner** | the outer loop (walk / march / population / collection) | new lib; today per-script |

The default SearchSpace (identity) is well-posed without fixing the similarity gauge:
`newtonFlatten`'s min-norm step is orthogonal to the gauge directions, so it never excites
them, and scale is handled by unit-area renormalization on certify. Gauge-fixing is *a*
SearchSpace you could construct (it's just more pins), no different from symmetry or any
other — not a default, not used now.

## Architecture — `src/search/` (pure, no three.js/DOM, same rule as `src/math`)

Imports only from `src/math` and `src/tori`. **The pervasive rule:** ops live in
SearchSpace coordinates `X`; every residual/energy is evaluated on `ι(x)` and its
gradient/Jacobian is pulled back through `A = Dι` (constant for affine `ι`): one
chain-rule line (`J·A`, `Aᵀ·∇`) applied uniformly. Default SearchSpace = identity
(`X = ℝ³ᵛ`), so an unconstrained search is unchanged.

### `space.ts` — the SearchSpace (the parametric domain)
```ts
export interface SearchSpace {
  readonly torus: Torus;
  readonly dim: number;                                  // dim X
  realize(x: ArrayLike<number>, out?: Float64Array): Float64Array;  // ι : X → ℝ³ᵛ
  lift(p: ArrayLike<number>, out?: Float64Array): Float64Array;     // π : ℝ³ᵛ → X (least-squares)
  jacobian(): Float64Array;                              // A = Dι (3V×dim, constant for affine)
}
export function fullSpace(torus): SearchSpace;                     // identity (default)
export function fromLinear(torus, conditions: LinearCondition[]): SearchSpace;  // affine ι(x)=Ax+b
export function fromMap(torus, realize, lift, jacobian): SearchSpace;           // a hand-written/ansatz ι
```
`fromLinear` solves the combined linear system into one affine `ι`; the rank reports
inconsistent / over-determined systems (surfaced, not silently mangled). `LinearCondition`
builders are just constructors — `symmetry(R)` (from `Torus.symmetryPairing`:
`v_{σ(i)} = R·v_i`), `pinVertex`, `pinCoord`, `inPlane` (and `gauge()` if ever wanted) —
all on equal footing. Perturbing `x` in `X` stays in-space by construction.

### `constraints.ts` — nonlinear equality fields (the `localize` trick)
```ts
export interface Constraint {
  readonly label: string; readonly codim: number;
  localize(torus, seed: ArrayLike<number>): readonly NewtonConstraint[];  // freeze chart at seed
}
```
Builders: `modulusWall(c)` = **exactly** `wall-ladder.sliceConstraint`; `modulusPoint(τ̂₀)`
(square `i`, hex `e^{iπ/3}`, …) — codim 2, frozen chart via `reduceModulusWithMatrix`. Raw
variants `tauWall/tauPoint/tauArc` are **explicitly labeled Teichmüller** (marking-dependent,
*not* the moduli locus) so a search can't confuse the two. (Flatness is implicit — it's what
`project` always enforces, not an extra constraint.)

### `regions.ts` — open conditions (supplies the two surrogates explicitly)
```ts
export interface Region {
  readonly label: string;
  contains(torus, p): boolean;             // gate (isEmbedded)
  margin(torus, p): number;                // signed depth (minMargin)
  enterEnergy(torus): RepulsionEnergy;     // REPULSION — pulls in from outside (makeCutOffArea / chord²)
  stayEnergy(torus): RepulsionEnergy;      // BARRIER  — keeps off the boundary / fattens (makeCellBarrier)
}
export function embedded(): Region;
```
Repulsion-vs-barrier is a named property of the region, chosen at the call site, not inferred.

### `certify.ts` + `outcome.ts` — measurement + diagnostics
```ts
export interface Certificate { coneDeficit; tau: V2; tauHat: V2; margin; embedded: boolean; } // raw AND reduced τ
export interface Outcome {
  x?: Float64Array; positions?: Float64Array; status: 'accepted'|'rejected'|'failed'|'blocked';
  cert?: Certificate;
  diagnostics: { newtonStatus?; residual?; movedFromSeed?;                    // did repair wander?
    realizedVsRequested?: { requested: V2; realized: V2; dist }; localDim?; reason? };
}
export function certify(torus, positions): Certificate;       // measures on the full config ι(x)
```
`certify` records raw **and** reduced τ (kills the [[night3-certificates-are-reduced]]
gotcha). `realizedVsRequested` catches chart flips on modulus projection (bite #1).

### `ops.ts` — the verbs (pure; all take a SearchSpace and run in `X`)
- `project(space, x, held: Constraint[], opts)` — Newton on `held` over `X`: residual
  `c.value(ι(x))`, flatness via `coneAngleJacobian` pulled back as `J·A`; **re-measures
  realized vs requested modulus.** (= the duplicated `projectAndVerify`, generalized.)
- `flowToward(space, x, held, region, opts)` — `embeddedFlow` on `region.enterEnergy`,
  gradient pulled back `Aᵀ∇`, re-projecting onto `held` each step, until `region.contains`.
- `fatten(space, x, held, region, opts)` — `embeddedFlow` on `region.stayEnergy` (= `fattenOnSlice`).
- `march(space, x, held, path: Constraint[], region, opts)` — continuation: step a
  parameterized family (`modulusWall(c)` sweep, or a τ-path) in adaptive substeps,
  re-projecting + re-gating each step. **The robust replacement for one-shot projection onto
  a far/thin target** (bites #1+#3); generalizes `wall-ladder.marchToSlice`; returns
  `'blocked'` + pinch location when the region blocks the path (a *result*, not a failure).
- `walk(space, pool, held, stay: Region, opts): Iterable<Outcome>` — perturb `x`→project→gate
  loop; reports `localDim = dim(X) − rank(J)` (Jacobian Newton already forms) and bails with a
  clear "rigid/isolated" verdict (bite #4 — what push-t7 was).
- helpers: `localDimension(...)`, `energyFromCompute(label, compute)` (FD-gradient wrapper,
  generalizing wall-ladder's local helper; builds attractive potentials toward a target).

### `index.ts` — re-exports; the public surface.

## Scripts — `scripts/lib/` (impure) + a unified CLI

`scripts/lib/{args,seeds,csv,runner}.mjs`: one copy of `flag/flags/num/has`; CSV pool load
(≥N-col filter, fattest-first sort, unit-area) → a `SeedSource`; 28-col writer with header;
the periodic-report + SIGINT-flush loop that streams a `SeedSource` through a staged pipeline
of ops and records accepted Outcomes.

`scripts/search.mjs` composes a `Problem {space, held[], seek, driver}` from flags:
```
npm run search -- --type 6 --driver walk \
  --space symmetry --pin 3:z=0 --held modulus:wall:0.5 --seek embedded \
  --seeds data/curated/rhombic-t6.csv --out samples/run.csv
```
Output: 28-col CSV (first 24 cols stay a valid embedding → `filter-wall`, `parseEmbeddings`,
demos keep working) + a `<out>.meta.json` sidecar with the full Problem + seed.

## Build stages (value-first; delicate code untouched in the first cut)

1. **Core + tests.** `src/search/{space,constraints,regions,certify,outcome,ops,index}.ts`
   and `src/search/*.test.ts`. SearchSpace is core from the start (identity + gauge + pins +
   symmetry). Pure, no CLI yet.
2. **Script libs + one new CLI** exercising `walk`/`project`, including the two things the old
   plan couldn't express: a **config-constraint** search (`--pin 3:z=0 --seek embedded`) and a
   **symmetry** search (reduced SearchSpace, symmetric by construction).
3. **Migrate the easy scripts** onto the kit (`search-near-rect`, `filter-wall`, `polish-rect`,
   `sample-rect`); confirm parity (*valid certified accepts at similar rate*, not bit-identical —
   RNG streams shift). Keep as thin wrappers; **do not delete** (reproducibility of `data/curated/`).
4. **Later / separate PRs:** lift `wall-ladder`'s march into `ops.march` with a parity check;
   wrap `push-re`'s population loop as a `population` runner; nonlinear `symmetry` if ever needed;
   `nearest`/arc presets. `wall-ladder.mjs`/`push-re.mjs` stay as-is until then.

## Critical files

- New (pure): `src/search/{space,constraints,regions,certify,outcome,ops,index}.ts` + `*.test.ts`.
- New (scripts): `scripts/lib/{args,seeds,csv,runner}.mjs`, `scripts/search.mjs`.
- Reused unchanged: `src/math/{newton,develop,angles,embedded,embeddedFlow,perturb}.ts`
  (esp. `coneAngleJacobian` for the flatness Jacobian pull-back),
  `src/math/energies/{types,cellMargin,cellBarrier,cutOffArea,chordLengthSquared}.ts`,
  `src/tori` (incl. `Torus.symmetryPairing`), `src/io/embeddings.ts`.
  (`normalize.ts` is a separate storage/dedup utility — not part of the search core.)
- Edited later (stage 3): the four easy scripts + `package.json` (`search` alias).

## Verification

1. `npx tsc --noEmit` — the lint (mind `erasableSyntaxOnly` / `import type` / explicit `.ts`).
2. `npx vitest run src/search`:
   - **SearchSpace:** `fullSpace` `realize`/`lift` round-trip = identity; `fromLinear([symmetry(R)])`
     realize → a config with `v_{σ(i)} = R·v_i` exactly; `A = jacobian()` matches FD of `realize`;
     ops in `fullSpace` reproduce current full-coord behavior.
   - **Constraint:** `modulusWall(0.5).localize(seed)` reproduces `wall-ladder.sliceConstraint`'s value;
     `modulusPoint(i)` residual 0 at τ=i.
   - **Region/certify:** `embedded().contains/margin` agree with `isEmbedded`/`minMargin` on
     `RICH_REFERENCE`; `certify` records raw==reduced τ for a rectangular row, raw≠reduced for a wall row.
   - **ops smoke:** `project` in `fullSpace` from a perturbed seed → deficit<tol, realized modulus ==
     requested; `project` in a `symmetry` SearchSpace yields a torus that is symmetric by construction;
     `walk` on a `data/curated/rhombic-t7.csv` row reports tiny `localDim` ("rigid").
3. Parity smoke (stage 3): refactored `search-near-rect` vs `data/curated/rhombic-t6.csv` → accepts
   with dist<eps + embedded; spot-check a reproduced τ̂ against a curated row.
4. New-capability proof (stage 2): a `--pin`/`--space symmetry` search runs and either accepts or
   reports `infeasible/empty` — the axis the old plan lacked.

## Explicitly out of first cut / honest gaps

- `march` (continuation) and the `population` runner are stage 4; the delicate `wall-ladder`/`push-re`
  numerics are not rewritten until then, and only with a parity check.
- `fromLinear` SearchSpaces are affine (`Dι` constant → cheap, exact); a hand-written nonlinear `ι`
  (`fromMap`) is allowed, but its `Dι` is finite-differenced unless supplied.
- `flowToward` uses existing repulsion energies for the non-smooth embeddedness condition (they work
  in practice); we are **not** solving the non-smooth `min`-over-pairs rigorously.
- SearchSpace consistency (over-determined / conflicting linear conditions) is **reported** via the
  rank / `localDimension`, not auto-resolved.
