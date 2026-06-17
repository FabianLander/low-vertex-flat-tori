/**
 * Chart implementations — parameterizations ι : X → C of configuration space.
 * The `Chart` contract itself lives in `solvers/types.ts` (it is what the solvers
 * consume); this module supplies the concrete charts.
 *
 * SLICE SCOPE: linear charts only — `identity` and `pinCoords`. Their Dι is a
 * constant SELECTION matrix A (orthonormal columns), which is exactly why the
 * pullback reproduces newton's frozen-columns behavior (see solvers/project.ts).
 * General (nonlinear / non-orthonormal) parameterizations need Dι(x) and a
 * min-norm-metric caveat; they are out of scope here.
 *
 * Pure: no three.js, no DOM, no Triangulation.
 */

import type { Chart } from '../solvers/types.ts';

/** The trivial chart X = C: the full configuration space, nothing fixed. */
export function identity(n: number): Chart {
  return {
    dim: n,
    ambient: n,
    realize(x, outC) {
      for (let i = 0; i < n; i++) outC[i] = x[i];
    },
    lift(c, outX) {
      for (let i = 0; i < n; i++) outX[i] = c[i];
    },
    pullbackRows(jc, rows, outJx) {
      const len = rows * n;
      for (let i = 0; i < len; i++) outJx[i] = jc[i];
    },
  };
}

/**
 * The chart that holds a set of coordinates FIXED at `pin` (default 0). X is the
 * remaining free coordinates; ι scatters them back and writes `pin` into the
 * frozen slots. Dι = A is the selection matrix of the free columns. This is the
 * structural form of newton's `frozenCoords` (e.g. z = 0 for planar vertices).
 *
 * `frozen` are coordinate indices into the flat config array (vertex i, axis a →
 * 3i + a). Every coordinate is either frozen or free, so ι covers all of C.
 */
export function pinCoords(frozen: readonly number[], n: number, pin = 0): Chart {
  const frozenSet = new Set(frozen);
  const free: number[] = [];
  for (let i = 0; i < n; i++) if (!frozenSet.has(i)) free.push(i);
  const d = free.length;
  return {
    dim: d,
    ambient: n,
    realize(x, outC) {
      for (const fi of frozen) outC[fi] = pin;
      for (let k = 0; k < d; k++) outC[free[k]] = x[k];
    },
    lift(c, outX) {
      for (let k = 0; k < d; k++) outX[k] = c[free[k]];
    },
    pullbackRows(jc, rows, outJx) {
      // outJx[r*d + k] = jc[r*n + free[k]] — keep only the free columns.
      for (let r = 0; r < rows; r++) {
        const src = r * n, dst = r * d;
        for (let k = 0; k < d; k++) outJx[dst + k] = jc[src + free[k]];
      }
    },
  };
}
