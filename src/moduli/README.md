# moduli/ — the modulus: measuring it, and the space it lives in

The geometric counterpart to `topology/`. Where `topology/` provides the finite
combinatorial data (the cut, develop order, gluing tree, generator loops), this
folder does the **geometric act**: develop one of OUR metric tori into the plane,
read its holonomy → the modulus **τ ∈ ℍ**, and reduce that to a point of moduli
space **ℍ/SL(2,ℤ)**.

Two files, the two halves of "the modulus":

- `develop.ts` — the developing map. Takes a realization (positions in ℝ³), reads
  its intrinsic metric (edge lengths), unfolds the triangulation along
  `topology/`'s develop order, and reads the holonomy of the marked generator loops
  → τ ∈ ℍ (its point in **Teichmüller** space, marking-dependent). Also `totalArea`,
  `developNet` (the planar net, for the develop animation), `Modulus` (the singular
  measurement record). This is the only place geometry meets the modulus; the
  combinatorial data it walks along all comes off the `Triangulation`.
- `reduce.ts` — the structure of the space τ lives in: the SL(2,ℤ) action on ℍ
  (`applyMobius`), the quotient map ℍ → ℍ/SL(2,ℤ) (`reduceModulus` /
  `reduceModulusWithMatrix`, the witness matrix for the frozen-chart constraints),
  and the special points `SQUARE` (i) and `HEXAGONAL` (e^{iπ/3}). **Torus-blind** —
  `Vec2` in, `Vec2` out; reducing is a fact about ℍ/SL(2,ℤ), not about any torus.

A point of either space is a `Vec2` (a complex number); which space it's in is
carried by the name (`tau` raw / `tauHat` reduced) and the function it came
through, not the type — the same plain-tuple convention as `geometry/`.

Depends on `topology/` (the `Triangulation` + its combinatorial decoration) and
`geometry/` (`Vec2`, triangle area). Consumed by `constraints/modulus` (which pins
τ / τ̂), `search/certify` (records both), and the viewer's modulus decorations.
Pure: no three.js, no DOM.
