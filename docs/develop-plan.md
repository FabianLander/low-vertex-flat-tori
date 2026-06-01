# Plan: develop flat tori into the plane & compute their modulus τ

## Goal

For each flat embedded 8-vertex torus (a row in `data/explore-from-seeds/`), compute its
point in **Teichmüller space** — the modulus τ ∈ ℍ of the flat torus — by developing the
triangulation into the plane and reading off the holonomy of two chosen curves. Then
visualize (a) one torus flattened into the plane, and (b) the τ of the whole dataset.

## Math we're relying on

- Cone angle = 2π at every vertex ⟹ no cone points ⟹ the metric is a **smooth flat torus**
  ℝ²/Λ for a lattice Λ. Its Teichmüller point is τ = v₂/v₁ where (v₁, v₂) is a basis of Λ.
- The modulus depends only on the **24 intrinsic edge lengths** ℓ_ij = |Pᵢ − Pⱼ| (from the
  3D embedding) plus the fixed orientation in `TRIANGLES`. The 3D coords enter *only* through
  the lengths — so this is cheap and scales to all ~45k rows.
- Holonomy ρ: π₁(T²)=ℤ² → Isom⁺(ℝ²) lands in **pure translations** (flatness ⟹ zero
  rotational holonomy around every loop). The two generating loops map to v₁, v₂ and
  Λ = ℤv₁ + ℤv₂.

## Intrinsic primitives (computed once per torus from the 3D coords)

- **Edge lengths** ℓ_ij = |Pᵢ − Pⱼ| (24 values).
- **Corner angles** α[t][k] = interior angle of triangle t at its local corner k (16×3). These
  are the per-corner angles `angles.ts` already sums into the cone angle; we expose them
  individually. They are the natural primitive for the unfolding (the corner angle at the pivot
  vertex *is* the rotation that aims the next edge in the plane) and they double as the flatness
  diagnostic (Σ around a vertex − 2π = residual, reused for coloring).
- Consistency guard: each 3D triangle is planar so its angles sum to π; to avoid float drift we
  derive the third angle as π − α − β (one `acos` per triangle avoided) or, equivalently, lay
  out each triangle's 2D template once from its edge lengths. Both give bit-identical geometry.

## Algorithm (per torus)

1. Compute the intrinsic primitives above.
2. **Unfold (develop the net).** Root = triangle 0, laid out CCW from its template. BFS across a
   *deterministic* spanning tree of the dual graph (16 triangle-nodes; arcs = shared edges).
   To place a child across a shared edge A→B already in the plane, set its free vertex
   C = A + ℓ_AC · rot(unit(B−A), +α_A) — i.e. step off by the stored corner angle — choosing the
   sign so the triangle is CCW in its `TRIANGLES` corner order (orientation-preserving). Result:
   a planar coordinate for every **corner** (triangle, local-vertex).
3. **Holonomy.** The 24 − 15 = 9 dual edges *not* in the tree are **cut edges**. For each, its
   two triangle-developments disagree by an isometry gₑ; since tree-edge transitions are the
   identity, gₑ is exactly the holonomy of that cut edge's fundamental loop. Record its
   translation vector τₑ and its **rotational defect** (angle between the two edge images,
   should be ≈ 0). The 9 τₑ generate Λ.
4. **Marking → (v₁, v₂).** Pick two cut edges whose fundamental loops form a basis of
   H₁(T²;ℤ). Their translations are v₁, v₂. Choice lives in a single named constant
   `MARKING = [i, j]` (indices into the deterministic, sorted cut-edge list) so it can be
   swapped later, or replaced by explicit user-specified vertex-loops.
5. **τ.** Orient so v₁×v₂ > 0 (right-handed). τ = (v₂ as ℂ)/(v₁ as ℂ), giving Im τ > 0.
   For the moduli-space view also compute `reduceModulus(τ)` — SL(2,ℤ)-reduce into the
   standard fundamental domain.

### Marking consistency (the one real subtlety)

- A **fixed** marking (same two cut edges for every torus) makes τ a continuous function, so
  each Markov walk becomes a continuous **trajectory in ℍ** (Teichmüller space). This is what
  we want for "where do the walks go."
- The reduced τ gives the point in **moduli space** ℍ/SL(2,ℤ) ("what shapes exist"), but the
  walk would teleport across the fundamental domain — so we keep both.
- Whether two cut edges form a unit-index basis is purely **combinatorial** (metric-independent):
  verify once on the Rich reference, then it holds for all tori.

### Built-in correctness checks (cheap, wired into the validation step)

1. **Covolume:** |v₁ × v₂| must equal the intrinsic `totalArea(p)` (index-1 basis + correct
   development). If |v₁×v₂| = k·area for integer k>1, the chosen pair isn't a basis — repick.
2. **Rotational defect** of every cut edge ≈ 0 — an independent numerical flatness check.
3. Sum of intrinsic corner angles around each interior net vertex ≈ 2π.

## Files

- **`src/math/develop.ts`** (pure — no three.js, no DOM). Exports:
  - `intrinsicEdgeLengths(positions)`
  - `developNet(positions)` → `{ corners, treeEdges, cutEdges: [{edge, t1, t2, translation, rotDefect}] }`
  - `MARKING` constant + `modulus(positions)` → `{ v1, v2, tau, area, covolume, rotDefect }`
  - `reduceModulus(tau)` → `{ tau, sl2z }`
- **validation** (a `scripts/*.mjs` runner): run on the Rich reference + the 7 seeds; assert the
  three checks above; print τ. Gate: must pass before any UI.
- **`demos/develop/`** (Canvas2D): one torus flattened — the unfolded net, the lattice vectors
  v₁/v₂, the fundamental parallelogram, the two marking curves; step through rows of a chosen
  seed walk. **Build this first.** Cut-edge coloring described below.
- **`demos/teichmuller/`** (Canvas2D, next): the ℍ view — τ for every row, each walk as a
  path/cloud, with the SL(2,ℤ) fundamental domain drawn.

## Visualization: coloring the cut (boundary) edges

The net's boundary is made of **cut edges**, each appearing as **two copies** identified by a
translation in Λ. We color copies-to-be-glued the same, so the gluing is readable by eye.
There are two regimes, and they differ by how aggressively we choose the cut:

### Regime A — the plain BFS net (9 cut edges, ≤9 colors)

The deterministic dual spanning tree leaves **9 cut edges**. Each is one primal edge with two
boundary copies → color each of the 9 pairs its own color; draw the translation arrow τₑ for
each pair. Concrete and easy — this is exactly "color the edges that are cut and identified by
translations the same color, in pairs." The 9 cut edges span H₁ but only **2 are independent**;
the other 7 identifications are local "folds," not handles.

### Regime B — canonical fundamental polygon (cut along the 2 generators, exactly 2 colors)

If the cut locus is arranged to be **exactly the two H₁ generators** γ₁, γ₂, the torus opens to
a single polygon whose boundary reads γ₁ γ₂ γ₁⁻¹ γ₂⁻¹ — **4 arcs in 2 pairs**. Color all of γ₁
(both copies) one color, all of γ₂ the other → two colors, four boundary curves, exactly the
clean picture. The two identifying translations are v₁ and v₂ themselves. This needs a
**tree–cotree (Eppstein) decomposition** to produce a canonical cut whose complement is a disk
and whose 1-skeleton-cut is two edge-loops; more machinery than Regime A, and the developed
polygon is a "wonky parallelogram" (opposite polygonal arcs are exact translates).

**Proposal:** build Regime A first (it also yields v₁, v₂ for τ via two of the cut edges), then
upgrade the *same* demo to Regime B once the engine + τ are validated. Marking is stored as the
two generating loops so both regimes and later user-specified curves share one definition.

## Decisions already made

- Marking: auto-pick a valid generating pair, stored as a swappable constant in `develop.ts`.
- Build order: developer engine + validation, then the net demo, then the ℍ view.

## Open questions / things to confirm

1. **Normalization of τ for display:** rotate v₁ onto the +real axis and scale |v₁| = 1 (pure
   convention; doesn't change the moduli point). OK?
2. **Net layout:** the raw BFS unfolding of a torus *self-overlaps* in the plane (unavoidable).
   Plan: draw it anyway (it's the literal developing map) and overlay the fundamental
   parallelogram + a couple of Λ-translates to show periodicity. Alternative: draw the torus
   as a single clean parallelogram ℝ²/Λ with the triangulation inside (vertices mod Λ). Want
   one, the other, or both?
3. **Demo data source:** read directly from `data/explore-from-seeds/*.csv`? (Vite `?raw` glob,
   like `flat-samples`.) These files are large (~5 MB) — may want to subsample for the browser.
