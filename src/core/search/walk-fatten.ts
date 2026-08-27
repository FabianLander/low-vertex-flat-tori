/**
 * walkFatten — steer a flat embedded torus toward a target Teichmüller modulus τ₀, and when the
 * march PINCHES, don't give up: **fatten harder** (grow the torus to a bigger one with more room)
 * and retry — optionally diffusing a small **fiber-walk** spread first to move from a different
 * shape. The escape variant of `steerModulus`.
 *
 *   seed (flat, embedded) → repeat[
 *       fatten-held (normal δ) → march toward τ₀ along the geodesic
 *       if the round pinched:
 *          ESCAPE: fatten-held HARDER (escalating δ, many iters) → a bigger torus → retry march
 *                  [ + optional fiber-walk blob: perturb within {flat ∧ τ}, keep the shape that
 *                    marches furthest ]
 *          if the escape made headway → keep going, else → a genuine pinch, stop
 *   ]
 *
 * WHY the harder fatten. steer's per-round fatten is a quick one-off (δ=0.005, ~300 iters) sized
 * to restore just enough margin for the next hop — so at a pinch it can only find the local
 * clearance the march immediately spends. The escape instead escalates δ (the cell-barrier's
 * equilibrium radius: bigger δ settles DEEPER inside Ω) with a big iteration budget, pushing the
 * torus to a genuinely bigger clearance — more runway for the march before it re-pinches. This is
 * "fatten longer to get to a bigger torus," done only when the cheap round stalls.
 *
 * WHY the fiber walk (opt-in). Fatten is a directed local move: it climbs to the clearance max of
 * THIS shape's basin. The shape that marches *past* τ_p may be a different member of the fiber, so
 * a random walk within {flat ∧ τ = τ_p} ∩ Ω gives a spread of shapes to retry the march from —
 * keep whichever gets furthest. (A local move like fatten, not a reseed; it stays in the connected
 * component.)
 *
 * The modulus is HELD throughout every fatten (`pinTeichmuller(point(τ))` in the held set) — every
 * bit of clearance is gained AT the current τ, never stolen by drifting to an easier modulus. RAW
 * Teichmüller τ (analytic, globally smooth); the path is the hyperbolic geodesic in ℍ. GATED, so
 * the whole trajectory stays embedded — a REACHED result is a flat embedded torus at τ₀ in hand.
 *
 * PRECONDITION — the seed must be flat AND embedded (feed it discover's / explore's output).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import type { Family } from '@core/solvers/types.ts';
import { flat } from '@core/constraints/flat.ts';
import { pinTeichmuller, point } from '@core/constraints/modulus.ts';
import { embeddedRegion, isEmbedded, makeCellBarrier } from '@core/embedding/index.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';
import { continuation } from '@core/solvers/continuation.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { perturb } from '@core/sampling/perturb.ts';
import { hyperbolicGeodesic } from './steer-modulus.ts';
import { measure, type Measurement } from './measure.ts';

export interface WalkFattenResult {
  /** The standard readout of the torus we ended on. */
  readonly measurement: Measurement;
  /** Did the interleaved march reach τ₀ staying embedded? */
  readonly reached: boolean;
  /** Where it pinched (raw τ), if it did not reach; else null. */
  readonly pinchTau: Vec2 | null;
  /** March rounds run. */
  readonly rounds: number;
  /** How many pinches the escape broke through. */
  readonly escapes: number;
}

export interface WalkFattenOptions {
  /** Reached when |τ − τ₀| < this. Default 1e-4. */
  modulusTol?: number;
  /** A round moving the modulus toward τ₀ by less than this counts as a pinch. Default 1e-5. */
  progressTol?: number;
  /** Max march rounds. Default 80. */
  maxRounds?: number;
  /** Accept threshold on max|2π−θ|. Default 1e-9. */
  angleTol?: number;
  /** Normal per-round fatten: cell-barrier δ (equilibrium radius) and iteration cap. Default 0.005 / 300. */
  marchDelta?: number;
  marchIters?: number;
  /** Escape fatten: escalating δ tried in order (bigger = deeper). Kept near the clearance CEILING
   *  these tori can actually reach (~few×1e-3) — chasing a δ far beyond it just burns iters at an
   *  unreachable equilibrium. Default [0.003, 0.006] / 600. */
  escapeDeltas?: number[];
  escapeIters?: number;
  /** Escape fatten step size: SMALL, because at ∂Ω the log-barrier gradient is stiff — the normal
   *  0.005 step overshoots out of Ω and `minimize` blocks at iter 0. Default 1e-6. */
  escapeStep?: number;
  /** Continuation step floor for each march hop (undefined → 1e-4 / 1e-7). Shrink both to squeeze
   *  finer along a thinning sliver near a wall — smaller bites cross ∂Ω less readily. */
  marchMinStep?: number;
  marchStallStep?: number;
  /** Fiber-walk blob on a still-stuck pinch: number of perturbed shapes to try (0 = off). Default 0. */
  walkBlob?: number;
  /** Fiber-walk perturbation σ. The sweet spot is ~1e-3–3e-3: big enough to spread, small enough
   *  that the re-projection onto {flat ∧ τ} stays embedded (at σ=0.01 most cross out). Default 0.002. */
  walkSigma?: number;
  /** RNG for the fiber walk — REQUIRED when walkBlob > 0. */
  rng?: () => number;
  /** Observe the trajectory: fires the current τ after the start and after each round/escape. */
  onRound?: (tau: Vec2, round: number, tag: 'start' | 'march' | 'escape') => void;
}

/**
 * Build the walkFatten attempt: a flat embedded seed ↦ a `WalkFattenResult` (reached τ₀ or pinched),
 * or `null` if the seed can't flatten or doesn't start embedded.
 */
export function walkFatten(
  triang: Triangulation,
  target: Vec2,
  opts: WalkFattenOptions = {},
): (seed: Float64Array) => WalkFattenResult | null {
  const region = embeddedRegion(triang);
  const modulusTol = opts.modulusTol ?? 1e-4;
  const progressTol = opts.progressTol ?? 1e-5;
  const maxRounds = opts.maxRounds ?? 80;
  const angleTol = opts.angleTol ?? 1e-9;
  const marchDelta = opts.marchDelta ?? 0.005;
  const marchIters = opts.marchIters ?? 300;
  const escapeDeltas = opts.escapeDeltas ?? [0.003, 0.006];
  const escapeIters = opts.escapeIters ?? 600;
  const escapeStep = opts.escapeStep ?? 1e-6;
  const marchMinStep = opts.marchMinStep;      // undefined → continuation's default (1e-4)
  const marchStallStep = opts.marchStallStep;  // undefined → continuation's default (1e-7)
  const walkBlob = opts.walkBlob ?? 0;
  const walkSigma = opts.walkSigma ?? 0.002;
  const rng = opts.rng;
  const onRound = opts.onRound;
  if (walkBlob > 0 && !rng) throw new Error('walkFatten: walkBlob > 0 needs opts.rng');

  const tauOf = (p: ArrayLike<number>): Vec2 => modulus(triang, p).tau;   // RAW Teichmüller τ
  const dist = (t: Vec2): number => Math.hypot(t[0] - target[0], t[1] - target[1]);

  /** Fatten x while HOLDING its current modulus, to the cell-barrier equilibrium at radius δ.
   *  `step` sets the descent step — small near ∂Ω (stiff barrier), the default 0.005 in the interior. */
  const fattenHeld = (x: Float64Array, delta: number, iters: number, step?: number): void => {
    const tc = tauOf(x);
    minimize(x, [flat(triang), pinTeichmuller(triang, point([tc[0], tc[1]]))],
      makeCellBarrier(triang, { delta }), { region, maxIters: iters, stepSize: step });
  };

  /** March x toward τ₀ along the geodesic from its current τ, as far as the margin allows (~one hop).
   *  `minStep`/`stallStep` set the continuation step floor — shrink them to slip finer bites along a
   *  thinning sliver near a wall (the gate blocks a step that would cross ∂Ω; a smaller step may not). */
  const marchTo = (x: Float64Array): void => {
    const geo = hyperbolicGeodesic(tauOf(x), target);
    const family: Family = {
      param: (q) => geo.fraction(tauOf(q)),
      held: (_q, s) => [flat(triang), pinTeichmuller(triang, point(geo.point(s)))],
    };
    continuation(x, family, 1, { region, minStep: marchMinStep, stallStep: marchStallStep });
  };

  return (x) => {
    if (project(x, [flat(triang)]).status !== 'converged') return null;   // re-flatten
    if (!isEmbedded(triang, x)) return null;                             // must START embedded — gated
    onRound?.(tauOf(x), 0, 'start');

    let escapes = 0;
    let round = 0;
    for (; round < maxRounds; round++) {
      const before = dist(tauOf(x));
      if (before < modulusTol) break;                                    // reached τ₀

      // normal round: quick fatten (held) then one march hop.
      fattenHeld(x, marchDelta, marchIters);
      marchTo(x);
      onRound?.(tauOf(x), round + 1, 'march');
      if (before - dist(tauOf(x)) >= progressTol) continue;              // headway → keep marching

      // PINCH — escape: fatten HARDER to a bigger torus (small step: stiff barrier at ∂Ω), retry march.
      for (const delta of escapeDeltas) fattenHeld(x, delta, escapeIters, escapeStep);
      marchTo(x);

      // optional fiber-walk spread: perturb within {flat ∧ τ}, fatten hard, march — keep the furthest.
      if (walkBlob > 0 && before - dist(tauOf(x)) < progressTol) {
        const held = [flat(triang), pinTeichmuller(triang, point([tauOf(x)[0], tauOf(x)[1]]))];
        let best = x.slice();
        let bestDist = dist(tauOf(x));
        for (let i = 0; i < walkBlob; i++) {
          const cand = perturb(x, walkSigma, rng!);                      // small step off the pinch shape
          if (project(cand, held).status !== 'converged' || !isEmbedded(triang, cand)) continue;
          fattenHeld(cand, escapeDeltas[escapeDeltas.length - 1], escapeIters, escapeStep);
          marchTo(cand);
          const d = dist(tauOf(cand));
          if (d < bestDist) { best = cand.slice(); bestDist = d; }
        }
        x.set(best);
      }

      onRound?.(tauOf(x), round + 1, 'escape');
      if (before - dist(tauOf(x)) >= progressTol) { escapes++; continue; }  // escape broke through
      break;                                                                // genuine pinch
    }

    const m = measure(triang, x);
    const reached = dist(m.tau) < modulusTol && m.coneDeficit < angleTol && m.embedded;
    return {
      measurement: m,
      reached,
      pinchTau: reached ? null : [m.tau[0], m.tau[1]],
      rounds: round,
      escapes,
    };
  };
}
