# viewer/ — viewing a realization

The **subject** that turns a configuration into a scene, plus the decorations beside
it and the appearance it wears. One shape — `triang → (positions → three.js)`, the
visual sibling of `coneDeficit(triang)`: a viewer **closes over the triangulation**
(the parts' buffers are sized by V/E/F) and **streams bare positions**. It is NOT a
`ConfigSpace` and never `pull`s — it consumes already-realized ℝ³ points; `PaperTorus`
appears only at the `fromPaper` boundary.

- `TorusView.ts` — `makeTorusView(triang, opts)`, **the one subject** (it replaced the
  old TorusView + TorusMesh): assembles the chosen `mesh/` parts (faces/edges/vertices),
  `draw(positions)` streams a realization, `paint{Vertices,Edges,Faces}(values, palette)`
  color a cell-domain from a **condition's** scalar field (e.g. `coneAngleDeficits`). The
  view stays dumb about meaning — the demo wires `condition → channel`. Material ownership
  is **Model A**: the subject frees the materials it builds; injected/shared ones stay the caller's.

The **decorations** (factory + `draw`, sit beside the subject):

- `slicePlane.ts` — a translucent plane + the live 3D section curve (drives `mesh/section`);
  `loops()` exposes the measured cross-section.
- `developedSheet.ts` — the flat torus unrolled (the net it folds from), grid-textured,
  with fold-line tubes.
- `modulusCell.ts` — the reduced lattice parallelogram Λ, from the modulus.

The **appearance** (injected look — material *primitives* + the one paper *theme*):

- `materials.ts` — surface (plain/grid), crease, vertex material primitives + `paperMaterials`
  (the graph-paper theme used by the `renders/` renders).
- `gridTexture.ts` — the fundamental-domain lattice grid + graph-paper canvas textures.
- `normalMap.ts` — load a tileable paper-grain normal map from `assets/textures`.
- `palette.ts` — scalar→color palettes (`DEFICIT`, `HIGHLIGHT`) + `colorsFromScalars` (the
  `setCellColors` feed).

Impure: the three.js + DOM boundary. Consumes the sibling `mesh/` + `@core/topology`; the path-traced
harness (`@app/render`: `Studio` / `stage` / `controls`) sits above. The appearance group is
a candidate to split into a `look/` sibling later (and `paperMaterials` — a *theme*, not a
primitive — to its own module).
