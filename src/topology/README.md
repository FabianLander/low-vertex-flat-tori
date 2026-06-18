# topology/ — the intrinsic torus, as generic machinery

The torus before any metric: its **combinatorics and homology**, plus the
**choice of developing chart** (how to cut it open, in what order to unfold, and
which loops mark it) — all derived from a triangle list and **validated by
V − E + F = 0**, with no baked-in 8/24/16 counts and no degree-6 assumption (only
Rich's #7 is degree-6-regular). Everything here runs on ANY triangulation,
headless. This is the **machinery**; the seven specific tori live as data in
`triangulations/`.

The line this folder holds: **topology is combinatorial.** It provides the finite
data a developing map walks along; it does NOT develop one of our metric tori or
read its holonomy — that geometric measurement is `moduli/` (`develop`). The one
subtlety is the canonical marking: choosing it canonically uses a *harmonic
layout*, which is itself a flat torus — but a convenient scratch one for laying the
vertices out in the plane, never one of OUR metrics. So the geometry here is a
*method* for computing combinatorial data (the marking/cut), and its output is
combinatorial. (It does lean on `geometry/vec2` for that scratch layout.)

- `triangulation.ts` — the `Triangulation` type + `defineTriangulation(spec)`.
  Derives edges, oriented vertex links, dual adjacency, degree sequence, the
  develop order + gluing tree, and the H₁ generators (or auto-derives the last
  two), validating the Euler characteristic. Also the combinatorial decoration
  types (`Marking`, `FundamentalDomain`, `Attach`, `DevelopStep`).
- `trees.ts` — the shared graph primitives: primal/dual spanning trees, the
  tree–cotree co-edges, and the LCA `treePath`. The combinatorial substrate the
  homology generators and the canonical marking are read off of.
- `marking.ts` — `canonicalDecoration`: picks the canonical marking (the cut +
  develop order + cut-aligned H₁ generators). The heavier derivation;
  deterministic and memoized, computed **on load** by the registry
  (`triangulations/index.ts`), ~0.1s per triangulation. Built on the two
  planar-layout helpers below.
- `harmonicLayout.ts` — `harmonicLayout`: the flat-torus harmonic (Tutte) embedding
  of any triangulation (tree–cotree → integer period cocycles → harmonic solve →
  whiten); gives lattice vertex positions + each edge's integer period `jump`. Also
  `periodicTiles` (the universal-cover patch, for the tiling demos). The scratch
  flat torus used to choose the marking.
- `fundamentalDomain.ts` — `exactMinCutDomain`: the provably-minimal compact
  fundamental domain by exhaustive cut-set search (exact and fast at E ≈ 24).
  `windingDevelop`/`windingNet`: order that domain as a centered outward spiral —
  the canonical `developOrder`, and the develop-winding animation net.

Of these, only `triangulation` is on the search/render hot path; `marking` (+ its
two layout helpers, and `trees`) runs once per triangulation when the registry
builds it, to pick the marking. The geometric developing map that produces the
modulus τ from a realization lives in **`moduli/develop`**.
