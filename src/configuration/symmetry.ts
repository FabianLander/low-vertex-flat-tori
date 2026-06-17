/**
 * Symmetry chart — a parameterization of the subspace of configurations invariant
 * under a linear involution of ℝ³ combined with a vertex pairing. The search then
 * runs in genuinely fewer variables and is symmetric BY CONSTRUCTION (exactly,
 * every realized config satisfies the symmetry) rather than by projection.
 *
 * Given an involution R (a per-axis sign `reflection`, here Rich's ρ(u,v,w) =
 * (−u,−v,w)) and a pairing of vertices, the invariant subspace is
 *
 *     P_{partner(a)} = R · P_a .
 *
 * Chart layout: each 2-cycle (a, partner) contributes its representative a's 3
 * coordinates as free X-parameters; the partner is determined (`= R·P_a`). A fixed
 * vertex (paired with itself / unpaired) contributes only the coordinates in R's
 * +1 eigenspace; the −1-eigenspace coordinates are pinned to 0. So for a clean
 * 4-pair symmetry of an 8-vertex torus, X = ℝ¹² (vs ℝ²⁴).
 *
 *   realize ι(x): write each rep from x, its partner as R·(that rep) — exactly symmetric.
 *   lift    π(c): the orthogonal projection onto the invariant subspace, then read reps
 *                 (rep ← ½(P_a + R·P_partner)). This is exactly the old `applyZ2` projection.
 *   pullbackRows: chain rule through Dι (column j hits the rep coord with 1 and the
 *                 partner coord with the axis sign).
 *
 * Note Dι's columns have norm √2 (not orthonormal), so — unlike `identity`/`pinCoords`
 * — `project`/`flow` here minimize in the X-metric, not the ambient C-metric. Still a
 * correct projection/descent on the (lower-dim, exactly-symmetric) manifold; it just
 * doesn't reproduce a naive ambient solve. The win is exact symmetry + fewer DOF.
 *
 * Pure: no three.js, no DOM.
 */

import type { Chart } from '../solvers/types.ts';

export type Reflection = readonly [number, number, number];
export type Pairing = readonly (readonly [number, number])[];

/** Rich's ρ-symmetry (his paper / the semi-solution construction): the involution
 *  ρ(u,v,w) = (−u,−v,w) with the antipodal vertex pairing of the 8-vertex torus. */
export const RICH_SYMMETRY: { reflection: Reflection; pairing: Pairing } = {
  reflection: [-1, -1, 1],
  pairing: [[0, 7], [1, 6], [2, 5], [3, 4]],
};

interface XCoord {
  src: number;   // C-index of the representative coordinate (3a + k)
  dst: number;   // C-index of the determined partner coordinate (3b + k), or -1 if none
  sign: number;  // the axis sign R[k]
}

export function symmetry(ambient: number, pairing: Pairing, reflection: Reflection = [-1, -1, 1]): Chart {
  const V = ambient / 3;
  const partnerOf = new Array<number>(V).fill(-1);
  for (const [a, b] of pairing) { partnerOf[a] = b; partnerOf[b] = a; }

  const coords: XCoord[] = [];
  const pinned: number[] = [];
  for (let v = 0; v < V; v++) {
    const p = partnerOf[v];
    if (p === -1) {
      // fixed vertex: free in R's +1 eigenspace, pinned to 0 in the −1 eigenspace.
      for (let k = 0; k < 3; k++) {
        if (reflection[k] === 1) coords.push({ src: 3 * v + k, dst: -1, sign: 1 });
        else pinned.push(3 * v + k);
      }
    } else if (v < p) {
      // representative of the 2-cycle: 3 free coords, partner determined.
      for (let k = 0; k < 3; k++) coords.push({ src: 3 * v + k, dst: 3 * p + k, sign: reflection[k] });
    }
    // v > p: the determined partner — contributes no free coordinate.
  }
  const d = coords.length;

  return {
    dim: d,
    ambient,
    realize(x, outC) {
      for (const c of pinned) outC[c] = 0;
      for (let j = 0; j < d; j++) {
        const { src, dst, sign } = coords[j];
        outC[src] = x[j];
        if (dst >= 0) outC[dst] = sign * x[j];
      }
    },
    lift(c, outX) {
      // orthogonal projection onto the invariant subspace, then read the reps.
      for (let j = 0; j < d; j++) {
        const { src, dst, sign } = coords[j];
        outX[j] = dst >= 0 ? 0.5 * (c[src] + sign * c[dst]) : c[src];
      }
    },
    pullbackRows(jc, rows, outJx) {
      for (let r = 0; r < rows; r++) {
        const ro = r * ambient;
        for (let j = 0; j < d; j++) {
          const { src, dst, sign } = coords[j];
          let v = jc[ro + src];
          if (dst >= 0) v += sign * jc[ro + dst];
          outJx[r * d + j] = v;
        }
      }
    },
  };
}
