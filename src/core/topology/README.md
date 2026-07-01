# topology/ — the intrinsic torus, as generic machinery

The torus before any metric: its **combinatorics and homology**, plus the
**choice of developing chart** (how to cut it open, in what order to unfold, and
which loops mark it) — all derived from a triangle list and **validated by
V − E + F = 0**, with no baked-in 8/24/16 counts and no degree-6 assumption (only
Rich's #7 is degree-6-regular). Everything here runs on ANY triangulation,
headless. This is the **machinery**; the specific tori live as data in
`triangulations/`.

The line this folder holds: **topology is combinatorial.** It provides the finite
data a developing map walks along; it does NOT develop one of our metric tori or
read its holonomy — that geometric measurement is `moduli/` (`develop`). The one
subtlety is the canonical marking: choosing it canonically uses a *harmonic
layout*, which is itself a flat torus — but a convenient scratch one for laying the
vertices out in the plane, never one of OUR metrics. So the geometry here is a
*method* for computing combinatorial data (the marking/cut), and its output is
combinatorial. (It does lean on `geometry/vec2` for that scratch layout.)

Two kinds of derived data, and the split is load-bearing:

- **cheap combinatorics** — edges, oriented vertex links, dual adjacency, degree
  sequence — fast pure functions of the triangle list, computed at build.
- the **marking** (the developing chart: loops + cut + develop order) — also a
  deterministic function of the triangle list, but **expensive** (harmonic layout +
  exact min-cut), so it is **precomputed offline** and *supplied* to the builder,
  not computed at load.

- `triangulation.ts` — the `Triangulation` type and the builder. `TriangulationData`
  (the stored input: `{ id, triangles, label? }`), `Marking` (the chart, in readable
  vertex/edge/face numbers), `Combinatorics` (the cheap derived tables), and the
  decoration types `Attach`/`DevelopStep`. `deriveCombinatorics(triangles)` derives
  + validates the cheap tables (Euler V−E+F=0, manifold edges, single-cycle links,
  coherent orientation); `makeTriangulation(data, marking)` joins them with the
  supplied marking into one `Triangulation`. **It never imports `marking.ts`** — the
  marking arrives precomputed, so building stays cheap.
- `trees.ts` — the shared graph primitives: primal/dual spanning trees, the
  tree–cotree co-edges, and the LCA `treePath`. The combinatorial substrate the
  homology generators and the canonical marking are read off of.
- `marking.ts` — `canonicalMarking(combinatorics)`: computes the canonical marking
  (cut + develop order + cut-aligned H₁ generators). The **expensive** derivation
  (~0.1s+ per triangulation); run **offline** by `scripts/compute-markings`, which writes
  one `triangulations/<census>.markings.generated.ts` per census. The runtime loads those
  tables and never calls this. Built on the two planar-layout helpers below.
- `harmonicLayout.ts` — `harmonicLayout`: the flat-torus harmonic (Tutte) embedding
  of any triangulation (tree–cotree → integer period cocycles → harmonic solve →
  whiten); gives lattice vertex positions + each edge's integer period `jump`. Also
  `periodicTiles` (the universal-cover patch, for the tiling demos). The scratch
  flat torus used to choose the marking.
- `fundamentalDomain.ts` — `exactMinCutDomain`: the provably-minimal compact
  fundamental domain by exhaustive cut-set search (exact and fast at E ≈ 24).
  `windingDevelop`/`windingNet`: order that domain as a centered outward spiral —
  the canonical `developOrder`, and the develop-winding animation net.
- `pachner.ts` — the Pachner **1↔3** moves (subdivide a face into three; `collapse` a degree-3
  vertex back) and `isReducible`: whether a triangulation is *just* a 1→3 subdivision of a smaller
  one (irreducible ⟺ genuinely new at its vertex count — the 1↔3 notion, distinct from
  edge-contraction irreducibility). Combinatorial, validity gated by `deriveCombinatorics`; used
  to classify the censuses, not on the hot path.

Of these, only `triangulation` (cheap combinatorics) is on the search/render hot
path. `marking` + its two layout helpers run **offline** (the marking generator), not
at load — so the heavy harmonic/min-cut code is out of the runtime path entirely. The
geometric developing map that produces the modulus τ from a realization lives in
**`moduli/develop`** (it reads the loaded marking).
