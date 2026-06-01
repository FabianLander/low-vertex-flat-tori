# A plan for finding flat embedded tori (the readable version)

## What we want
An 8-vertex torus that is **flat** (foldable from flat paper — every vertex has exactly 360°
around it) **and embedded** (sits in 3D without any triangles crossing). Both at once, with only
8 vertices, is rare and hard.

## Why the old way is so slow
The usual approach: throw 8 points into 3D space, then *adjust them until every vertex happens to
total exactly 360°*. That "until exactly 360° at all 8 vertices" is **8 simultaneous nonlinear
equations** — a brittle thing to solve, and when you do solve it you land on some random,
ugly, self-crossing shape that almost never happens to be embedded. So you flatten first and then
fight (usually lose) to remove the crossings. That's the 2-days-for-7 experience.

The trap is the **order**: we make flatness *the thing we solve for*, and it's the expensive thing.

## The key idea: get flatness for free
A flat torus is **literally a flat sheet of paper with opposite edges taped together** (the plane
modulo a lattice). Here's the move:

> Mark the 8 vertices and draw the 16 triangles **directly on such a paper sheet.** The result is
> flat *automatically* — every vertex has a full 360° around it for the trivial reason that it's
> just a point on a flat sheet. **Nothing to solve.**

The only thing you must respect is that the triangles actually **tile** the sheet (no triangle
folds over another). That's not an equation — it's an easy, cheap condition to check and keep
("don't let any triangle flip inside out"). So flatness goes from "8 hard equations" to "stay in
an allowed region," the same easy *kind* of condition as embeddedness.

So we **separate the two requirements**, each handled in its natural home:
- **Flat** — free, by living on the paper sheet.
- **Embedded** — the real work: fold that marked sheet into 3D without crossings.

## What "folding into 3D" actually means (and why it's well-behaved)
On the paper sheet, every edge has a definite length. We now look for **3D positions of the 8
vertices whose edges have those same lengths.** If all edge lengths match, then every triangle in
3D is congruent to its paper version, so the 3D surface is *also* intrinsically flat — we never
re-check angles, it's automatic.

"Find positions with prescribed edge lengths" is a **classic, gentle problem**: picture a network
of rigid rods at fixed rest-lengths, or springs you let relax. You minimize a simple energy
("how far off are the edge lengths from their targets?"), and it behaves like a physical
relaxation — no brittle Newton, robust solvers, easy to restart from a good guess. That's the
whole point: we replaced the nasty flatness solve with a friendly spring-relaxation.

While we relax, we keep two cheap guards on:
- **don't flip a triangle on the paper** (keeps it flat), and
- **don't let two triangles collide in 3D** (keeps it embedded).

## The bonus: the torus's shape becomes a dial
When we pick the paper sheet, we pick the **shape of the torus** — its modulus τ (the point in the
upper half-plane your viewer plots). So τ is now an **input**, not an accident of the search. We
can literally ask: *"Is there an embedded fold of the τ-shaped flat torus?"* — and **sweep τ across
the plane to map exactly which shapes can be built.** That directly answers your "how spread out
can the moduli get" question, instead of hoping a random walk drifts there.

## The plan, step by step
1. **Choose a target shape τ.** This fixes the paper sheet (the lattice).
2. **Lay the 8 vertices on the sheet.** Start from a regular placement; their in-plane positions
   are adjustable knobs. Flat for free (as long as no triangle flips).
3. **Fold into 3D.** Start the 3D positions from a fat donut (which is already embedded), then
   relax: nudge the 3D positions *and* the in-plane positions to make every 3D edge length match
   its paper length, while (a) keeping all triangles un-flipped on the paper and (b) pushing apart
   any triangles that get close to colliding in 3D.
4. **Accept** when the edge lengths match (the fold is exact) and nothing collides — that's a flat
   embedded torus of shape ≈ τ.
5. **Sweep τ** over a grid, each time warm-starting from a nearby shape that already worked. The
   shapes that succeed *are* the achievable region; the shapes where the fold can't close up
   without colliding mark its **boundary**.

## A speed boost for the hardest part (cold start)
Do the whole thing first in the **symmetric setting** (impose the 180° rotational symmetry Rich's
torus has). It pairs the vertices, halving the number of free positions and the difficulty — this
is where I'd expect the biggest jump over hand-search. Once we have any seed, the existing Markov
walk roams its neighborhood freely, and we can drop the symmetry to pick up the asymmetric ones.

## How we'll know fast whether this works (before building the big sweep)
A small, decisive test, reusing the developing code we already have:
1. **Reproduce a known torus.** Take one of your 7, read off its paper-sheet description, and check
   we can fold it back to itself. *(Confirms the paper-sheet bookkeeping is right.)*
2. **Re-fold after a kick.** Push its 3D vertices around, then run the relaxation; does it snap
   back to an embedded flat torus? *(Confirms the relaxation actually finds folds.)*
3. **Cold start from a plain donut.** Start from a generic fat donut at a chosen τ (nowhere near a
   known example) and see if the relaxation can reach an embedded flat torus at all.

If test 3 succeeds even sometimes, this beats hand-search by a lot and we scale it. If it always
jams short of a clean fold, we've learned the realization is the true wall — in an afternoon, not
two days.

## Honest read
- "Flatness is free on the paper sheet" — solid, this is the real structural win.
- "The fold relaxation actually reaches embedded flat tori from a donut" — the genuine unknown,
  and exactly what test 3 settles cheaply. The risk is that the foldable shapes are rare enough
  that the relaxation usually stalls just short; symmetry, many restarts, and shape-sweeping
  (warm starts) are the levers if it's borderline.

This doesn't make the problem easy — *building a flat torus from 8 triangles is genuinely
constrained* — but it puts the one unavoidable hard step (the fold) into a robust, restartable
solver with the torus's shape as a dial, instead of a brittle equation solve that lands you in a
random self-crossing mess.
