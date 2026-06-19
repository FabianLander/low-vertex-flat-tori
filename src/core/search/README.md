# search/ — composing a search and running it

What the searches are doing, geometrically: land on the flat manifold, move along it (the
modulus foliation) while staying inside the embedded region — the direct-solve vs `continuation`
fork.

The top layer: wire seeds + a recipe into a driver, and certify the results.
Depends on everything below; nothing depends on it. There is **no `Problem`
god-object** — a search is just a seed source, an `attempt` recipe, and the
`collect` driver, composed in a few lines (the thin `scripts/discover.mjs` /
`scripts/wall.mjs` runners show it).

- `certify.ts` — turn a config into a `Certificate` (cone deficit, embedded,
  margin, raw τ AND reduced τ̂, area, rotDefect). Every search ends here.
- `collect.ts` — the rejection-sampling driver: `collect(drawSeed, attempt, …)`.
  Pure control flow; all IO via `onAccept`/`onTry` callbacks. (Seed sources themselves
  live in `sampling/`.)
- `pull.ts` — pull a `Constraint` (and an ambient `Region` via `ambientRegion`) into a coordinate
  system: the bridge between `configuration/`+`coordinates/` and the conditions
  (`constraints/`+`embedding/`), so the ℝⁿ solvers get pulled `Fn`s and a `Region`.
- `recipe.ts` — `flattenFlowEmbed(torus, buildHeld, accept, energy)`: the shared recipe
  `seed → project(held) → minimize(held, energy, region=embedded) → certify`, on `fullSpace`.
- `discover.ts` — find any flat embedded torus. `held = [flat]`.
- `wall.ts` — find flat embedded tori on a modulus wall `|Re τ̂| = c` (rectangular
  c=0, rhombic c=½). `held = [flat, modulusWall(seed, c)]` — the same recipe, descending
  while staying on the wall (frozen chart, near targets only).
- `marchModulus.ts` — reach a FAR wall by `continuation` instead of one direct solve:
  track the target `|Re τ̂|` leaf-by-leaf (re-freezing the chart each step, embedded
  region active), crossing chambers and reporting the **pinch** where Ω closes if the
  wall is unreachable. `wallFamily` + `marchToWallAttempt`.
- `semiSolution.ts` — the Doyle–Schwartz semi-solution scan: a flat *immersion*
  search ("semi" = embeddedness recorded, not required). DS tent seeds → `project(
  pinCoords(baseZ), [flat, collinear(1,2,3), collinear(4,5,6)])` → certify;
  `semiSolutionAttempt` + `doyleSchwartzTentSeeds`.

The runnable searches are thin `scripts/` wrappers over this folder: `npm run discover`,
`npm run wall`, `npm run semi-solutions`, `npm run march-modulus`. The core operations
(`project`/`minimize`/`continuation`) live in `solvers/`; the conditions (closed `{g=0}` in
`constraints/`, the open embedded region in `embedding/`); the map toolkit in `functions/`; coordinate systems in
`coordinates/`; seed sources in `sampling/`. The old scripts are archived (read-only) in
`scripts/legacy/`.
