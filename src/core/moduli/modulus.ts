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
// lengths (`fillLen`); `canonicalShape` (in `develop`) supplies the shape derivatives; the
// product/quotient rules propagate the rest. Exact, one forward pass → the full 2×3V
// Jacobian. The fold guard (height floor) lives in `canonicalShape`.
//
// SCRATCH / OUT-PARAMS — why this is written allocation-free. The earlier version built
// each dual-complex op functionally (every `caddC`/`cmulC`/… returned a fresh
// `{re,im,gre,gim}` with two new `Float64Array(n)` gradient buffers), so a single
// `tauJacobian` allocated a few HUNDRED short-lived length-3V arrays. That is invisible for
// `discover` (held = [flat], which never touches τ), but `wall`/`march`/`fixedModulus` call
// this Jacobian thousands of times per seed inside `project`/`minimize`, so those arrays
// became real GC pressure — exactly the asymmetry that made the allocation-free
// `coneAngleJacobian` ~25% faster than its naive form. The ops below instead WRITE INTO a
// caller-supplied `DualC`, drawing every buffer from a per-triangulation scratch arena
// (`tauScratch`, memoized in a `WeakMap` like `framePlan`), so steady-state allocation is
// ZERO. The arithmetic is byte-for-byte the old forward mode — only the storage changed —
// matching the allocation-free house style of the rest of the hot path (`flat`, the QR
// kernel). Reusing the arena across calls is safe under the module's feed-forward
// non-re-entrancy contract: `tauJacobian` never re-enters itself, and the solvers evaluate
// Jacobians sequentially, so two calls never share the arena mid-flight.
//   (A larger win — reverse-mode, which would drop the length-n gradient carried through
//    every op, O(n·F) → O(F) — is deferred: it doubles the value/dual sync burden the tests
//    guard, for a constant-factor gain that is small at n ≈ 24.)

/** A complex value carrying its gradient w.r.t. the n = 3V position coordinates. The ops
 *  below WRITE INTO a destination `DualC` rather than returning a fresh one. */
type DualC = { re: number; im: number; gre: Float64Array; gim: Float64Array };

/** out ← a + b. `out` may alias `a` or `b` (each index is read before it is written). */
function addC(a: DualC, b: DualC, out: DualC, n: number): void {
  for (let i = 0; i < n; i++) { out.gre[i] = a.gre[i] + b.gre[i]; out.gim[i] = a.gim[i] + b.gim[i]; }
  out.re = a.re + b.re; out.im = a.im + b.im;
}
/** out ← a − b. `out` may alias `a` or `b`. */
function subC(a: DualC, b: DualC, out: DualC, n: number): void {
  for (let i = 0; i < n; i++) { out.gre[i] = a.gre[i] - b.gre[i]; out.gim[i] = a.gim[i] - b.gim[i]; }
  out.re = a.re - b.re; out.im = a.im - b.im;
}
/** out ← a · b. The input scalars/components are read into locals before any write, so
 *  `out` may alias `a` or `b`. */
function mulC(a: DualC, b: DualC, out: DualC, n: number): void {
  const are = a.re, aim = a.im, bre = b.re, bim = b.im;
  for (let i = 0; i < n; i++) {
    const ag = a.gre[i], ah = a.gim[i], bg = b.gre[i], bh = b.gim[i];
    out.gre[i] = ag * bre + are * bg - ah * bim - aim * bh;
    out.gim[i] = ag * bim + are * bh + ah * bre + aim * bg;
  }
  out.re = are * bre - aim * bim; out.im = are * bim + aim * bre;
}
/** out ← a / b = (a·conj b)/|b|² (quotient rule on the numerator a·conj b and D = |b|²).
 *  Alias-safe in the same way as `mulC`. */
function divC(a: DualC, b: DualC, out: DualC, n: number): void {
  const are = a.re, aim = a.im, bre = b.re, bim = b.im;
  const D = bre * bre + bim * bim, D2 = D * D;
  const numRe = are * bre + aim * bim, numIm = aim * bre - are * bim;
  for (let i = 0; i < n; i++) {
    const ag = a.gre[i], ah = a.gim[i], bg = b.gre[i], bh = b.gim[i];
    const dnumRe = ag * bre + are * bg + ah * bim + aim * bh;
    const dnumIm = ah * bre + aim * bg - ag * bim - are * bh;
    const dD = 2 * bre * bg + 2 * bim * bh;
    out.gre[i] = (dnumRe * D - numRe * dD) / D2;
    out.gim[i] = (dnumIm * D - numIm * dD) / D2;
  }
  out.re = numRe / D; out.im = numIm / D;
}

/** Edge length ℓ_ij: returns ℓ and writes `∂ℓ/∂p` (the unit edge vector, in the two
 *  endpoints' slots) into `g`, which is fully overwritten. */
function fillLen(p: ArrayLike<number>, i: number, j: number, g: Float64Array): number {
  g.fill(0);
  const oi = 3 * i, oj = 3 * j;
  const dx = p[oi] - p[oj], dy = p[oi + 1] - p[oj + 1], dz = p[oi + 2] - p[oj + 2];
  const v = Math.hypot(dx, dy, dz);
  const inv = v > 0 ? 1 / v : 0;
  g[oi] = dx * inv; g[oi + 1] = dy * inv; g[oi + 2] = dz * inv;
  g[oj] = -dx * inv; g[oj + 1] = -dy * inv; g[oj + 2] = -dz * inv;
  return v;
}

/** Fill triangle `t`'s canonical corners as dual complexes INTO `canonT` (its three scratch
 *  slots): slot 0 is the origin (constant zero — left untouched), slot 1 = (ℓ01, 0), slot 2 =
 *  (x2, y2) from `canonicalShape`. `lg1`,`lg2` are scratch for ∂ℓ02,∂ℓ12 (∂ℓ01 is written
 *  straight into `canonT[1].gre`, where it must end up anyway). Chains `canonicalShape`'s
 *  ∂_/∂ℓ with ∂ℓ/∂p; the shape formula + fold guard live in `canonicalShape`. */
function fillCanon(
  triang: Triangulation, p: ArrayLike<number>, n: number, t: number,
  canonT: [DualC, DualC, DualC], lg1: Float64Array, lg2: Float64Array,
): void {
  const [a, b, c] = triang.triangles[t];
  const q1 = canonT[1], q2 = canonT[2];
  const l01 = fillLen(p, a, b, q1.gre);          // q1.gre = ∂ℓ01/∂p, and stays so
  q1.re = l01; q1.im = 0; q1.gim.fill(0);
  const l02 = fillLen(p, a, c, lg1);
  const l12 = fillLen(p, b, c, lg2);
  const sh = canonicalShape(l01, l02, l12);
  q2.re = sh.x2; q2.im = sh.y2;
  for (let i = 0; i < n; i++) {
    q2.gre[i] = sh.dx2[0] * q1.gre[i] + sh.dx2[1] * lg1[i] + sh.dx2[2] * lg2[i];
    q2.gim[i] = sh.dy2[0] * q1.gre[i] + sh.dy2[1] * lg1[i] + sh.dy2[2] * lg2[i];
  }
}

/** The per-triangulation dual-complex scratch arena: every buffer `tauJacobian` writes,
 *  allocated once and memoized (mirrors `framePlan`). `canon[t][0]` is each triangle's origin
 *  vertex, left at its constructed zero forever (the develop never moves it). */
type TauScratch = {
  readonly canon: [DualC, DualC, DualC][];        // per triangle
  readonly R: DualC[];                            // per triangle (frame rotation, dual)
  readonly v1: DualC; readonly v2: DualC;         // loop holonomies
  readonly ep: DualC; readonly et: DualC; readonly prod: DualC;  // recurrence temps
  readonly edge: DualC; readonly term: DualC;     // holonomy temps
  readonly tau: DualC;
  readonly lg1: Float64Array; readonly lg2: Float64Array;        // ∂ℓ02,∂ℓ12 scratch
};

const scratchCache = new WeakMap<Triangulation, TauScratch>();

function tauScratch(triang: Triangulation): TauScratch {
  const hit = scratchCache.get(triang);
  if (hit) return hit;
  const n = triang.vertexCount * 3, F = triang.triangles.length;
  const mk = (): DualC => ({ re: 0, im: 0, gre: new Float64Array(n), gim: new Float64Array(n) });
  const s: TauScratch = {
    canon: Array.from({ length: F }, () => [mk(), mk(), mk()] as [DualC, DualC, DualC]),
    R: Array.from({ length: F }, mk),
    v1: mk(), v2: mk(), ep: mk(), et: mk(), prod: mk(), edge: mk(), term: mk(), tau: mk(),
    lg1: new Float64Array(n), lg2: new Float64Array(n),
  };
  scratchCache.set(triang, s);
  return s;
}

/** Loop holonomy = Σ over the loop's directed edges of R_t·(canon_lb − canon_la),
 *  accumulated INTO `acc` (zeroed first); `edge`,`term` are scratch. Dual twin of `loopHolonomy`. */
function holoInto(
  reads: readonly { t: number; la: number; lb: number }[],
  canon: [DualC, DualC, DualC][], R: DualC[],
  acc: DualC, edge: DualC, term: DualC, n: number,
): void {
  acc.re = 0; acc.im = 0; acc.gre.fill(0); acc.gim.fill(0);
  for (const { t, la, lb } of reads) {
    subC(canon[t][lb], canon[t][la], edge, n);
    mulC(R[t], edge, term, n);
    addC(acc, term, acc, n);
  }
}

/**
 * Exact ∂τ/∂p, written into `out` (2×3V row-major: row 0 = ∂Re τ, row 1 = ∂Im τ). The
 * dual twin of `modulus`: same `framePlan` walk and gauge (including the v₁,v₂ orientation
 * swap, locally constant and taken by value), in dual-complex arithmetic over the reused
 * scratch arena (see the section header).
 */
export function tauJacobian(triang: Triangulation, p: ArrayLike<number>, out: Float64Array): void {
  const n = triang.vertexCount * 3;
  const plan = framePlan(triang);
  const S = tauScratch(triang);
  const { canon, R } = S;

  fillCanon(triang, p, n, plan.root, canon[plan.root], S.lg1, S.lg2);
  const Rr = R[plan.root];                          // R_root = 1
  Rr.re = 1; Rr.im = 0; Rr.gre.fill(0); Rr.gim.fill(0);
  for (const s of plan.steps) {
    fillCanon(triang, p, n, s.t, canon[s.t], S.lg1, S.lg2);
    const cp = canon[s.parent], q = canon[s.t];
    subC(cp[s.lpSv], cp[s.lpSu], S.ep, n);          // canEdge_parent
    subC(q[s.ltSv], q[s.ltSu], S.et, n);            // canEdge_t
    mulC(R[s.parent], S.ep, S.prod, n);
    divC(S.prod, S.et, R[s.t], n);                  // R_t = (R_parent · ep) / et
  }

  holoInto(plan.loops[0], canon, R, S.v1, S.edge, S.term, n);
  holoInto(plan.loops[1], canon, R, S.v2, S.edge, S.term, n);
  let v1 = S.v1, v2 = S.v2;
  if (v1.re * v2.im - v1.im * v2.re < 0) { const tmp = v1; v1 = v2; v2 = tmp; }  // orient τ ∈ ℍ
  divC(v2, v1, S.tau, n);
  for (let i = 0; i < n; i++) { out[i] = S.tau.gre[i]; out[n + i] = S.tau.gim[i]; }
}
