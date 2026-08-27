# mesh/ — the k-cells realized in ℝ³

The torus as three.js geometry: the **parts** a `TorusView` is built from, each
realizing one cell-dimension of the triangulation. Factory over the triangulation —
`make…(triang)` closes over the combinatorics (the buffers are sized by V/E/F) and
returns something `draw(positions)` streams a realization into; bare positions, the
same currency as the search interior. **All real geometry** (no `LineSegments` /
`InstancedMesh`) so it renders identically in the WebGL preview and the path tracer.

The three **parts**, under one `Part` contract (`part.ts`: `domain` ∈
{vertex,edge,face} + `cellCount`) — so coloring is one operation, a scalar field on
the k-cells mapped through a palette (`setColors`):

- `part.ts` — the `Part` contract: the 0/1/2-cells as one shape. `draw` streams
  positions; `setColors` is the orthogonal per-cell color channel.
- `vertices.ts` — `makeVertices`: the 0-cells, a Group of spheres (V).
- `edges.ts` — `makeEdges`: the 1-cells, a Group of cylinder tubes (E).
- `faces.ts` — `makeFaces`: the 2-cells, ONE non-indexed flat-shaded mesh (F) —
  one geometry, because flat shading + per-face uv (the cut seam) + per-face tint
  all need each triangle to own its 3 corners. Optional lattice uv / solidify slab.
- `instanceGroup.ts` — the scaffolding shared by `vertices`/`edges`: a Group of one
  geometry cloned into N per-cell materials, owning the color channel, dispose, and
  the **Model A** material ownership (the creator frees).

Plus the standalone maps + pure helpers:

- `section.ts` — `makeSection`: plane ∩ the realization → ordered, **measurable**
  loops (`perimeter` / `area`), not a segment soup.
- `obj.ts` — `paperToObj` / `paperFromObj` (pure) + `downloadObj`: the realization as a Wavefront
  OBJ, and back. Reading IDENTIFIES the triangulation from the file's own face list rather than
  trusting a caller, so a mislabelled file is rejected instead of rendering as the wrong torus
  polyhedron, on disk (the disk-sibling of the three.js realization).
- `orient.ts` — outward-normal helpers (push tubes/spheres proud of the faces;
  offset the solidified inner skin).
- `uv.ts` — `latticeUV`: the intrinsic flat coordinate `M⁻¹·P` as a seamless texture map.
- `splat.ts` — the one non-indexed triangle-splat primitive.

Impure: the three.js boundary. Consumes `@core/topology` (the `Triangulation`) + `@core/moduli` (`develop`)
and `@core/geometry` (the `Vec3` tuple); the `PaperTorus` boundary bundle appears only at
`obj`. The subject that assembles these parts lives in the sibling `viewer/`.
