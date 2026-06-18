# topology/ — the intrinsic flat torus, as generic machinery

The torus before any embedding: pure combinatorics + the developing map, derived
from a triangle list and **validated by V − E + F = 0** — no baked-in 8/24/16
counts, no degree-6 assumption (only Rich's #7 is degree-6-regular). Everything
here runs on ANY triangulation, headless. This is the **machinery**; the seven
specific tori live as data in `triangulations/` (the same machinery↔instances
split as `functions/`↔`conditions/` and `configuration/`↔`coordinates/`).

**Depends only on `geometry/`** — the pure ℝ²/ℝ³ metric floor (the developing map's
planar net uses `geometry/vec2`) — and nothing else in `src/`. Pure: no three.js, no
DOM, no 3D metric on the interior (coordinates enter only through the developing map,
to read edge lengths).

- `triangulation.ts` — the `Triangulation` type + `defineTriangulation(spec)`.
  Derives edges, oriented vertex links, dual adjacency, degree sequence, the
  develop order + gluing tree, and the H₁ generators (or auto-derives the last
  two), validating the Euler characteristic. **Purely intrinsic** — the extrinsic
  triangle-collision tables (which non-adjacent cells the embedding check tests)
  live in `conditions/embedded/cells.ts`, with their consumer, not here.
- `develop.ts` — the developing map: unfold a flat realization → read the holonomy
  of the marked generator loops → the modulus **τ ∈ ℍ** (Teichmüller), and
  `reduceModulus`/`reduceModulusWithMatrix` → **τ̂ ∈ ℍ/SL(2,ℤ)** (moduli). Plus
  `totalArea`, `applyMobius`. What `conditions/modulus`, `certify`, and the viewer's
  modulus decorations read.
- `marking.ts` — `canonicalDecoration`: picks the canonical marking (the cut +
  develop order + cut-aligned H₁ generators). The heavier derivation; deterministic
  and memoized, computed **on load** by the registry (`triangulations/index.ts`),
  ~0.1s per triangulation. Built on the two planar-layout helpers below.
- `harmonicLayout.ts` — `harmonicLayout`: the flat-torus harmonic (Tutte) embedding
  of any triangulation (tree–cotree → integer period cocycles → harmonic solve →
  whiten); gives lattice vertex positions + each edge's integer period `jump`. Also
  `periodicTiles` (the universal-cover patch, for the tiling demos).
- `fundamentalDomain.ts` — `exactMinCutDomain`: the provably-minimal compact
  fundamental domain by exhaustive cut-set search (exact and fast at E ≈ 24).
  `windingDevelop`/`windingNet`: order that domain as a centered outward spiral —
  the canonical `developOrder`, and the develop-winding animation net.

Of these, only `triangulation` + `develop` are on the search/render hot path;
`marking` (+ its two layout helpers) runs once per triangulation when the registry
builds it, to pick the marking.
