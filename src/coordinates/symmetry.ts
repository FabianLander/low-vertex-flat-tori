/**
 * symmetry — the coordinate system of configurations invariant under a linear
 * involution `R` (a per-axis sign) plus a vertex pairing: P_{partner(a)} = R·P_a.
 * Each 2-cycle contributes its representative's 3 coordinates as parameters (the
 * partner is determined); a fixed/unpaired vertex contributes only R's +1-eigenspace
 * coordinates. For Rich's 4-pair ρ on an 8-vertex torus, ℝ²⁴ ↦ ℝ¹², every realized
 * config EXACTLY symmetric by construction.
 *
 * Dφ's columns have norm √2 (rep + determined partner), so the pullback metric is
 * 2·I on the paired coordinates — uniform, hence harmless under the solver's current
 * g = I. `coords` is the orthogonal projection onto the invariant subspace, then read
 * the reps (the old `applyZ2`).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { Embedding } from '../functions/compose.ts';
import { makeConfigSpace, type ConfigSpace } from '../configuration/space.ts';

export type Reflection = readonly [number, number, number];
export type Pairing = readonly (readonly [number, number])[];

/** Rich's ρ-symmetry: the involution ρ(u,v,w) = (−u,−v,w) with the antipodal
 *  vertex pairing of the 8-vertex torus. */
export const RICH_SYMMETRY: { reflection: Reflection; pairing: Pairing } = {
  reflection: [-1, -1, 1],
  pairing: [[0, 7], [1, 6], [2, 5], [3, 4]],
};

interface SymCoord {
  src: number;   // C-index of the representative coordinate (3a + k)
  dst: number;   // C-index of the determined partner coordinate (3b + k), or -1
  sign: number;  // the axis sign R[k]
}

export function symmetry(
  triang: Triangulation,
  pairing: Pairing = RICH_SYMMETRY.pairing,
  reflection: Reflection = RICH_SYMMETRY.reflection,
): ConfigSpace {
  const ambient = triang.vertexCount * 3;
  const V = triang.vertexCount;
  const partnerOf = new Array<number>(V).fill(-1);
  for (const [a, b] of pairing) { partnerOf[a] = b; partnerOf[b] = a; }

  const cs: SymCoord[] = [];
  const pinned: number[] = [];
  for (let v = 0; v < V; v++) {
    const p = partnerOf[v];
    if (p === -1) {
      for (let k = 0; k < 3; k++) {
        if (reflection[k] === 1) cs.push({ src: 3 * v + k, dst: -1, sign: 1 });
        else pinned.push(3 * v + k);
      }
    } else if (v < p) {
      for (let k = 0; k < 3; k++) cs.push({ src: 3 * v + k, dst: 3 * p + k, sign: reflection[k] });
    }
  }
  const d = cs.length;

  const phi: Embedding = {
    inDim: d,
    outDim: ambient,
    value(x, out) {
      for (const c of pinned) out[c] = 0;
      for (let j = 0; j < d; j++) {
        const { src, dst, sign } = cs[j];
        out[src] = x[j];
        if (dst >= 0) out[dst] = sign * x[j];
      }
    },
    jacobian(_x, out) {
      out.fill(0);                          // ambient×d
      for (let j = 0; j < d; j++) {
        const { src, dst, sign } = cs[j];
        out[src * d + j] = 1;
        if (dst >= 0) out[dst * d + j] = sign;
      }
    },
  };

  return makeConfigSpace(triang, phi, (p, outX) => {
    for (let j = 0; j < d; j++) {
      const { src, dst, sign } = cs[j];
      outX[j] = dst >= 0 ? 0.5 * (p[src] + sign * p[dst]) : p[src];
    }
  });
}
