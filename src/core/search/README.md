# search/ — composing a search and running it

What the searches do, geometrically: **land on the flat manifold F, then move within F ∩ Ω**
(flat ∧ embedded) — either *entering* Ω from outside (ungated) or *staying* inside it (gated).
Every routine is a short composition of the three `solvers/` verbs over one mutable
configuration, ending in `measure`. There is **no `Problem` god-object and no shared recipe**: a
search is a **seed source** (`sampling/`) × an **attempt** (`(seed) => Result | null`, written
out in full here) × the **`collect`** driver — wired in a few lines by the thin `scripts/`
runners. Depends on everything below; nothing depends on it.

## The substrate — the fixed mechanism every routine uses

- `measure.ts` — `measure(triang, positions): Measurement`, the standard readout of a
  realization: `coneDeficit` (flatness), `embedded` + `clearance`, raw `tau` AND reduced
  `tauHat`, `area`, `rotDefect`. It is **verification, not output** — a routine re-measures the
  truth (including quantities it did not target), because a solver only *thinks* it converged.
  Lives here because it is the lowest layer allowed to import all three condition folders
  (`constraints`/`embedding`/`moduli`) at once.
- `collect.ts` — the rejection-sampling driver `collect(drawSeed, attempt, …)`: draw seeds, run
  the attempt, keep the non-null results. Pure control flow; IO via `onAccept`/`onTry`. The
  iteration axis (perturbations / a growing pool / a target grid) is the caller's.
- `pull.ts` — the bridge from a `ConfigSpace` to ℝⁿ: pull a `Constraint[]`/`Region` through φ so
  the solvers get pulled `Fn`s (`pullHeld`, `ambientRegion`). A no-op under `fullSpace` (φ = id);
  it earns its keep for the pinned/symmetry charts (`discover` takes an optional reduced `space`).

## The routines — each a plain attempt, written out (no shared recipe)

The one distinction that organizes them is the relationship to Ω: **enter (ungated)** vs **stay
(gated)** — the gate is `embeddedRegion` (`embedding/`), and it is forced by the job, not a knob.

- `discover.ts` — find a flat embedded torus. `project([flat])` lands on F, then `minimize([flat],
  overlap)` flows ALONG F toward Ω **ungated** (discover starts *outside* Ω and falls in — a gate
  would forbid the very entry it exists to make), embeddedness emerging as the overlap energy → 0;
  `measure` verifies flat ∧ embedded. Seed-agnostic; does NOT fatten or gate.
- `improve.ts` — deepen a flat embedded torus: `minimize([flat], barrier, region=embeddedRegion)`,
  **gated**, pushing clearance toward the basin's intrinsic ceiling while staying in Ω. The mirror
  of `discover` (enter-ungated vs stay-gated) and the first consumer of `embeddedRegion`. Tori
  pinned right on ∂Ω are left for a future `push-off-boundary` routine.
- `steer-modulus.ts` — transport a flat embedded torus to a prescribed Teichmüller modulus τ₀ by a
  **fatten-interleaved continuation** along the hyperbolic geodesic in ℍ: repeat[ fatten at the
  current τ (barrier, *modulus held* so clearance can't drift τ) → march toward τ₀ (continuation,
  gated) ], keeping the whole path in Ω and reporting the pinch where the embedded component ends.
  A sufficient-but-not-necessary constructive existence test for "is there an embedded torus at
  τ₀." Records its trajectory via `onRound` for the `demos/steer-modulus` animation.

## `legacy/` — transitional, superseded but still wired to scripts/tests

Quarantined in `legacy/` (mirroring `scripts/legacy/`), still functional until their scripts/tests
migrate onto the substrate above: `recipe.ts` (the `flattenFlowEmbed` god-recipe the new routines
replace), `wall.ts`, `marchModulus.ts` (→ `steer-modulus`), `semiSolution.ts` (the Doyle–Schwartz
flat-immersion scan), and `certify.ts` (→ `measure`). Do not build on these. (The DS closed-form
seed `doyleSchwartzPositions` is not here — it moved to `sampling/doyleSchwartz.ts` where seed
sources live; the DS coordinate system is `coordinates/dsScaffold`.)

## Running them

Thin `scripts/` wrappers: `npm run discover` (plus `wall`/`semi-solutions`/`march-modulus` over
the legacy routines). The verbs (`project`/`minimize`/`continuation`) live in `solvers/`; the
conditions in `constraints/` (closed `{g = target}`) + `embedding/` (the open `Region`); the map
toolkit in `functions/`; coordinate systems in `coordinates/`; seed sources in `sampling/`.
`scripts/legacy/` is a read-only archive.
