# search/ — composing a search and running it

**What the searches are doing, geometrically, is written up in
[`docs/math/searches.md`](../../docs/math/searches.md)** — the flat manifold, the
modulus foliation, the embedded region, and the direct-solve vs `march` fork.

The top layer: wire seeds + a recipe into a driver, and certify the results.
Depends on everything below; nothing depends on it. There is **no `Problem`
god-object** — a search is just a seed source, an `attempt` recipe, and the
`collect` driver, composed in a few lines (the thin `scripts/discover.mjs` /
`scripts/wall.mjs` runners show it).

- `certify.ts` — turn a config into a `Certificate` (cone deficit, embedded,
  margin, raw τ AND reduced τ̂, area, rotDefect). Every search ends here.
- `collect.ts` — the rejection-sampling driver: `collect(drawSeed, attempt, …)`.
  Pure control flow; all IO via `onAccept`/`onTry` callbacks.
- `seeds.ts` — seed sources (`perturbedSeeds`, `poolSeeds`, `uniformSeeds`) + σ
  draws, composing `configuration/perturb` + an RNG.
- `recipe.ts` — `flattenFlowEmbed(torus, buildHeld, accept, energy)`: the shared
  recipe `seed → project(held) → flow(held, energy, region=embedded) → certify`.
- `discover.ts` — find any flat embedded torus. `held = [flat]`.
- `wall.ts` — find flat embedded tori on a modulus wall `|Re τ̂| = c` (rectangular
  c=0, rhombic c=½). `held = [flat, modulusWall(seed, c)]` — the same recipe, flow
  staying on the wall.

The core operations (`project`/`flow`/`march`) live in `solvers/`; the conditions
in `submanifolds/`/`regions/`; the maps in `functions/`; charts/seeds in
`configuration/`. The old discovery scripts are archived in `scripts/legacy/`.

To come: a `march`-based driver (continuation to a far modulus target) and the
semi-solution scan rebuilt as a search (DS seed + pinned chart + collinear).
