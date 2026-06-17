# geometry/ — pure ℝ²/ℝ³ kernels

Torus-blind geometric primitives. No `Triangulation`, no configuration-space
knowledge — every routine takes raw coordinates (or a `positions` buffer + vertex
offsets), so the triangle→vertex lookup lives in the layer above.

The **kernels the search pipeline needs** (consumed by `math/energies/*`, later
`functions/`):

- `distance.ts` — allocation-free squared-distance kernels between points,
  segments, and filled triangles (Ericson closest-point routines).
- `intersectionChord.ts` — `triTriChord(pos, oa0..ob2)`: the segment two triangles
  share, from six vertex offsets into a shared `positions` buffer.

`drawing/` — plane-curve utilities for **figures and demos**, not the search
pipeline: 2D vectors, parametric `PlaneCurve`s with arclength queries, and tracing
a curve through a planar point cloud (used to thread a path through the moduli
scatter in the `moduli-trace` / `curve-cloud` demos). Kept apart from the kernels
above because it's presentation logic — it knows about payloads, gaps, and
matches, not just geometry.
