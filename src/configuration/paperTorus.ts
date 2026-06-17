/**
 * PaperTorus — the boundary bundle: a configuration paired with the triangulation
 * needed to interpret it, `{ triang, positions }`.
 *
 * The interior of the search threads BARE positions (a `Float64Array`), with the
 * triangulation living in the `Fn`/`ConfigSpace` closures. `PaperTorus` is the form a
 * configuration takes at the BOUNDARY — IO (a CSV row only means something paired
 * with a `T`), certify, rendering — where the closure context is gone and a point
 * must carry its triangulation. Produced by `ConfigSpace.paperTorus(x)`.
 *
 * It is pure DATA: a plain object, like `Triangulation` (built by `defineTriangulation`).
 * No geometry/measurement methods — those are free functions in their own layers (cone
 * angles in `conditions/flat`, ℝ³ kernels in `geometry/`, area in `topology/develop`),
 * so this type depends only on the triangulation and stays a clean sibling of
 * `conditions/`. Construct through `makePaperTorus` / `paperTorusFromVec3s` (which
 * validate the one invariant — `positions.length === 3V` — at the IO boundary); the
 * interior never builds a malformed one.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';

export interface PaperTorus {
  readonly triang: Triangulation;
  /** Vertex positions in ℝ³, length 3·V, layout [x0,y0,z0, …]. */
  readonly positions: Float64Array;
}

/** Build a `PaperTorus`, validating the positions length (a fresh copy is taken). */
export function makePaperTorus(triang: Triangulation, positions?: ArrayLike<number>): PaperTorus {
  const n = triang.vertexCount * 3;
  const p = new Float64Array(n);
  if (positions) {
    if (positions.length !== n) {
      throw new Error(`PaperTorus expects ${n} floats, got ${positions.length}`);
    }
    p.set(positions);
  }
  return { triang, positions: p };
}

/** Build from an array of V vertex triples [[x,y,z], …]. */
export function paperTorusFromVec3s(
  triang: Triangulation,
  verts: readonly (readonly [number, number, number])[],
): PaperTorus {
  if (verts.length !== triang.vertexCount) {
    throw new Error(`expected ${triang.vertexCount} vertices, got ${verts.length}`);
  }
  const p = new Float64Array(triang.vertexCount * 3);
  for (let i = 0; i < triang.vertexCount; i++) {
    p[3 * i] = verts[i][0];
    p[3 * i + 1] = verts[i][1];
    p[3 * i + 2] = verts[i][2];
  }
  return { triang, positions: p };
}

/** A deep copy (fresh positions buffer). */
export function clonePaperTorus(pt: PaperTorus): PaperTorus {
  return { triang: pt.triang, positions: pt.positions.slice() };
}
