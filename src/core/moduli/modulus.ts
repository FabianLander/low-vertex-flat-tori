/**
 * modulus — the Teichmüller modulus τ ∈ ℍ of a flat torus, measured DIRECTLY from the
 * developing frames (`develop.developFrames`), and its exact Jacobian ∂τ/∂p.
 *
 * The holonomy of a generator loop is the sum of developed edge vectors `R_t · c^t`
 * over the loop's directed edges — `R_t` the per-triangle frame rotation, `c^t` the
 * canonical edge vector — so τ = v₂/v₁ falls straight out of the frames, with NO vertex
 * positions / developed net. (One can also read τ off the developed image with
 * `develop.tauFromNet`; the two agree to machine precision — the consistency test.)
 *
 * `tauJacobian` is the same computation in forward-mode (dual complex): each quantity
 * carries its gradient w.r.t. the 3V position coords, and the standard
 * product/quotient rules propagate it, giving the exact 2×3V Jacobian in one pass.
 * Value (`modulus`) and dual (`tauJacobian`) are a value/dual PAIR — they share the
 * combinatorial recipe (`framePlan`) and the shape formula (`canonicalShape`) from
 * `develop`, and duplicate only the short complex recurrence (`cmul`/`cdiv` vs the dual
 * `cmulC`/`cdivC`). They must stay in sync (like `coneAngleJacobian` ↔ `cornerAngleGrad`),
 * which the FD + similarity-invariance + consistency tests guard.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { type Vec2, det2 } from '@core/geometry/vec2.ts';
import { framePlan, developFrames, canonicalShape, cmul, cdiv, totalArea, type Frames } from './develop.ts';

export type Modulus = {
  /** Holonomy translations of the two generator loops, positively oriented. */
  readonly v1: Vec2;
  readonly v2: Vec2;
  /** τ = v₂/v₁ as a complex number; Im τ > 0. */
  readonly tau: Vec2;
  /** Intrinsic total area (= covolume of Λ for a unit-index basis). */
  readonly area: number;
  /** |v₁ × v₂|; equals `area` exactly when the generators are a unit-index basis. */
  readonly covolume: number;
  /** Max |net rotation| over the cut edges (≈ 0 ⟺ holonomy is a pure translation ⟺ flat). */
  readonly rotDefect: number;
};

/** Loop holonomy = Σ over its directed edges of the developed edge vector `R_t · c^t`. */
function loopHolonomy(frames: Frames, reads: readonly { t: number; la: number; lb: number }[]): Vec2 {
  let x = 0, y = 0;
  for (const { t, la, lb } of reads) {
    const c = frames.canon[t];
    const w = cmul(frames.R[t], [c[lb][0] - c[la][0], c[lb][1] - c[la][1]]);
    x += w[0]; y += w[1];
  }
  return [x, y];
}

/** The modulus τ, computed directly from the developing frames (no developed net). */
export function modulus(triang: Triangulation, p: ArrayLike<number>): Modulus {
  const plan = framePlan(triang);
  const frames = developFrames(triang, p);
  let v1 = loopHolonomy(frames, plan.loops[0]);
  let v2 = loopHolonomy(frames, plan.loops[1]);
  if (det2(v1, v2) < 0) [v1, v2] = [v2, v1];   // orient so τ ∈ ℍ (consistent across dataset)

  // rotDefect: the rotational holonomy mismatch at each cut edge (frame data, no positions).
  let rotDefect = 0;
  for (const cut of plan.cuts) {
    const c1 = frames.canon[cut.t1], c2 = frames.canon[cut.t2];
    const d1 = cmul(frames.R[cut.t1], [c1[cut.lv1][0] - c1[cut.lu1][0], c1[cut.lv1][1] - c1[cut.lu1][1]]);
    const d2 = cmul(frames.R[cut.t2], [c2[cut.lv2][0] - c2[cut.lu2][0], c2[cut.lv2][1] - c2[cut.lu2][1]]);
    const ang = Math.abs(Math.atan2(d1[0] * d2[1] - d1[1] * d2[0], d1[0] * d2[0] + d1[1] * d2[1]));
    if (ang > rotDefect) rotDefect = ang;
  }

  return {
    v1, v2,
    tau: cdiv(v2, v1),
    area: totalArea(triang, p),
    covolume: Math.abs(det2(v1, v2)),
    rotDefect,
  };
}

// ─── ∂τ/∂p — forward-mode complex differentiation of the same frame walk ──────
//
// The value/dual twin of `modulus`: each complex quantity carries its gradient w.r.t.
// the n = 3V position coords (a "dual complex"). Positions enter only through the edge
// lengths (`dlen`); `canonicalShape` (in `develop`) supplies the shape derivatives; the
// product/quotient rules propagate the rest. Exact, one forward pass → the full 2×3V
// Jacobian. The fold guard (height floor) lives in `canonicalShape`.

/** A complex value carrying its gradient w.r.t. the n = 3V position coordinates. */
type DualC = { re: number; im: number; gre: Float64Array; gim: Float64Array };

function zeroC(n: number): DualC { return { re: 0, im: 0, gre: new Float64Array(n), gim: new Float64Array(n) }; }
function oneC(n: number): DualC { return { re: 1, im: 0, gre: new Float64Array(n), gim: new Float64Array(n) }; }

function caddC(a: DualC, b: DualC, n: number): DualC {
  const gre = new Float64Array(n), gim = new Float64Array(n);
  for (let i = 0; i < n; i++) { gre[i] = a.gre[i] + b.gre[i]; gim[i] = a.gim[i] + b.gim[i]; }
  return { re: a.re + b.re, im: a.im + b.im, gre, gim };
}
function csubC(a: DualC, b: DualC, n: number): DualC {
  const gre = new Float64Array(n), gim = new Float64Array(n);
  for (let i = 0; i < n; i++) { gre[i] = a.gre[i] - b.gre[i]; gim[i] = a.gim[i] - b.gim[i]; }
  return { re: a.re - b.re, im: a.im - b.im, gre, gim };
}
function cmulC(a: DualC, b: DualC, n: number): DualC {
  const gre = new Float64Array(n), gim = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    gre[i] = a.gre[i] * b.re + a.re * b.gre[i] - a.gim[i] * b.im - a.im * b.gim[i];
    gim[i] = a.gre[i] * b.im + a.re * b.gim[i] + a.gim[i] * b.re + a.im * b.gre[i];
  }
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re, gre, gim };
}
/** a / b = (a·conj b)/|b|², via the quotient rule on the numerator a·conj b and D=|b|². */
function cdivC(a: DualC, b: DualC, n: number): DualC {
  const D = b.re * b.re + b.im * b.im;
  const numRe = a.re * b.re + a.im * b.im, numIm = a.im * b.re - a.re * b.im;
  const gre = new Float64Array(n), gim = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const dnumRe = a.gre[i] * b.re + a.re * b.gre[i] + a.gim[i] * b.im + a.im * b.gim[i];
    const dnumIm = a.gim[i] * b.re + a.im * b.gre[i] - a.gre[i] * b.im - a.re * b.gim[i];
    const dD = 2 * b.re * b.gre[i] + 2 * b.im * b.gim[i];
    gre[i] = (dnumRe * D - numRe * dD) / (D * D);
    gim[i] = (dnumIm * D - numIm * dD) / (D * D);
  }
  return { re: numRe / D, im: numIm / D, gre, gim };
}

/** Edge length ℓ_ij as a real value + its gradient (the unit edge vector) w.r.t. p. */
function dlen(p: ArrayLike<number>, n: number, i: number, j: number): { v: number; g: Float64Array } {
  const oi = 3 * i, oj = 3 * j;
  const dx = p[oi] - p[oj], dy = p[oi + 1] - p[oj + 1], dz = p[oi + 2] - p[oj + 2];
  const v = Math.hypot(dx, dy, dz);
  const inv = v > 0 ? 1 / v : 0;
  const g = new Float64Array(n);
  g[oi] = dx * inv; g[oi + 1] = dy * inv; g[oi + 2] = dz * inv;
  g[oj] = -dx * inv; g[oj + 1] = -dy * inv; g[oj + 2] = -dz * inv;
  return { v, g };
}

/** `canonicalCorners` as dual complexes — `canonicalShape` (value + ∂/∂ℓ) chained with
 *  `∂ℓ/∂p` (from `dlen`). The shape formula + fold guard live in `canonicalShape`. */
function canonicalDuals(triang: Triangulation, p: ArrayLike<number>, n: number, t: number): [DualC, DualC, DualC] {
  const [a, b, c] = triang.triangles[t];
  const l01 = dlen(p, n, a, b), l02 = dlen(p, n, a, c), l12 = dlen(p, n, b, c);
  const sh = canonicalShape(l01.v, l02.v, l12.v);
  const gx2 = new Float64Array(n), gy2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    gx2[i] = sh.dx2[0] * l01.g[i] + sh.dx2[1] * l02.g[i] + sh.dx2[2] * l12.g[i];
    gy2[i] = sh.dy2[0] * l01.g[i] + sh.dy2[1] * l02.g[i] + sh.dy2[2] * l12.g[i];
  }
  const q0 = zeroC(n);
  const q1: DualC = { re: l01.v, im: 0, gre: l01.g.slice(), gim: new Float64Array(n) };
  const q2: DualC = { re: sh.x2, im: sh.y2, gre: gx2, gim: gy2 };
  return [q0, q1, q2];
}

/**
 * Exact ∂τ/∂p, written into `out` (2×3V row-major: row 0 = ∂Re τ, row 1 = ∂Im τ). The
 * dual twin of `modulus`: same `framePlan` walk and gauge (including the v₁,v₂
 * orientation swap, locally constant and taken by value), in dual-complex arithmetic.
 */
export function tauJacobian(triang: Triangulation, p: ArrayLike<number>, out: Float64Array): void {
  const n = triang.vertexCount * 3;
  const plan = framePlan(triang);
  const F = triang.triangles.length;
  const R: DualC[] = new Array(F);
  const canon: [DualC, DualC, DualC][] = new Array(F);

  canon[plan.root] = canonicalDuals(triang, p, n, plan.root);
  R[plan.root] = oneC(n);
  for (const s of plan.steps) {
    const q = canonicalDuals(triang, p, n, s.t);
    canon[s.t] = q;
    const cp = canon[s.parent];
    const ep = csubC(cp[s.lpSv], cp[s.lpSu], n);   // canEdge_parent
    const et = csubC(q[s.ltSv], q[s.ltSu], n);     // canEdge_t
    R[s.t] = cdivC(cmulC(R[s.parent], ep, n), et, n);
  }

  const holo = (reads: readonly { t: number; la: number; lb: number }[]): DualC => {
    let acc = zeroC(n);
    for (const { t, la, lb } of reads) {
      acc = caddC(acc, cmulC(R[t], csubC(canon[t][lb], canon[t][la], n), n), n);
    }
    return acc;
  };
  let v1 = holo(plan.loops[0]);
  let v2 = holo(plan.loops[1]);
  if (det2([v1.re, v1.im], [v2.re, v2.im]) < 0) { const tmp = v1; v1 = v2; v2 = tmp; }
  const tau = cdivC(v2, v1, n);
  for (let i = 0; i < n; i++) { out[i] = tau.gre[i]; out[n + i] = tau.gim[i]; }
}
