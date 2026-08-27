/**
 * steerModulus — transport a flat EMBEDDED torus to a prescribed Teichmüller modulus τ₀ ∈ ℍ,
 * staying embedded the whole way, by a FATTEN-INTERLEAVED march along the hyperbolic geodesic.
 *
 *   seed (flat, embedded) → repeat[ fatten at the current τ → continuation toward τ₀ along the geodesic ]
 *
 * Why interleaved (measured): a single continuation pins τ and re-projects min-norm, which LOSES
 * clearance as the modulus moves — so from a marginal torus it soon pinches. The cloud of
 * embedded tori was BUILT by small clearance-preserving steps, so crossing it needs the same:
 * restore a robust margin, march a bit, restore, march again. Each round rebuilds the geodesic
 * from the current τ to τ₀ and continues until it reaches τ₀ or a whole round makes no headway —
 * the GENUINE pinch, where the embedded component ends along this geodesic. There is no fixed
 * range: it keeps stepping as far as the component reaches.
 *
 * The fatten HOLDS the modulus — `minimize([flat, τ=current], barrier)`, not a free `improve` —
 * because a free fatten drifts τ (it doesn't care about the modulus), and that drift is *away*
 * from τ₀ as often as not, eating the march's progress and stalling the loop short of any real
 * boundary (measured: ~30–50% of each step wasted, sometimes net-negative). Holding τ zeroes the
 * drift, so every round's headway is the march's.
 *
 * RAW Teichmüller: τ is globally smooth (analytic `tauJacobian`), so the held constraint is
 * `pinTeichmuller(point(·))` — identity chart, no reduction, no chart to freeze. The path is the
 * hyperbolic geodesic in ℍ (the straight line in moduli space's metric): a vertical segment when
 * the endpoints share Re, else the real-axis-centered semicircle.
 *
 * GATED throughout, so the whole trajectory stays in Ω. So `steerModulus` is a
 * SUFFICIENT-but-not-necessary existence test for "is there an embedded torus at τ₀": a REACHED
 * result is a flat embedded torus AT τ₀, in hand — a constructive proof; a pinch only means THIS
 * seed couldn't get there staying embedded (the ungated "by any path" question is a separate
 * tool, as is the stochastic marching frontier, which routes around pinches this can't).
 *
 * PRECONDITION — the seed must be flat AND embedded. Feed it a pool of known embedded tori
 * (discover's output, or the explore data) via `collect`.
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
import { measure, type Measurement } from './measure.ts';

/** The hyperbolic geodesic in ℍ from `from` to `to`: a point map (s ∈ [0,1]) and the inverse
 *  (where a τ sits along it, as a fraction). Vertical segment if Re's match (Im interpolated
 *  geometrically — the hyperbolic arclength param), else the real-axis-centered semicircle. */
export function hyperbolicGeodesic(from: Vec2, to: Vec2): { point: (s: number) => Vec2; fraction: (tau: Vec2) => number } {
  const dRe = to[0] - from[0];
  if (Math.abs(dRe) < 1e-9) {
    const re = from[0], y0 = from[1], logRatio = Math.log(to[1] / y0);
    return {
      point: (s) => [re, y0 * Math.exp(s * logRatio)],
      fraction: (t) => (logRatio === 0 ? 1 : Math.log(t[1] / y0) / logRatio),
    };
  }
  const c = (to[0] * to[0] + to[1] * to[1] - from[0] * from[0] - from[1] * from[1]) / (2 * dRe); // center on ℝ
  const r = Math.hypot(from[0] - c, from[1]);
  const th0 = Math.atan2(from[1], from[0] - c);
  const dth = Math.atan2(to[1], to[0] - c) - th0;
  return {
    point: (s) => { const t = th0 + s * dth; return [c + r * Math.cos(t), r * Math.sin(t)]; },
    fraction: (t) => (dth === 0 ? 1 : (Math.atan2(t[1], t[0] - c) - th0) / dth),
  };
}

export interface SteerModulusOptions {
  /** Reached when |τ − τ₀| < this. Default 1e-4. */
  modulusTol?: number;
  /** A round (fatten + march) that moves the modulus less than this toward τ₀ counts as pinched. Default 1e-5. */
  progressTol?: number;
  /** Max fatten/march rounds. Default 60. */
  maxRounds?: number;
  /** Accept threshold on max|2π−θ|. Default 1e-9. */
  angleTol?: number;
  /** Observe the trajectory through ℍ: fires the current modulus τ after the start and after
   *  each fatten+march round. For animating / recording the path; does not affect the search. */
  onRound?: (tau: Vec2, round: number) => void;
}

/**
 * Build the steerModulus attempt: a flat embedded seed ↦ a flat embedded `Measurement` AT τ₀ if
 * the interleaved march reached the target staying embedded, else `null` (pinched short).
 */
export function steerModulus(
  triang: Triangulation,
  target: Vec2,
  opts: SteerModulusOptions = {},
): (seed: Float64Array) => Measurement | null {
  const held = [flat(triang)];
  const region = embeddedRegion(triang);
  const barrier = makeCellBarrier(triang, { delta: 0.005 });
  const modulusTol = opts.modulusTol ?? 1e-4;
  const progressTol = opts.progressTol ?? 1e-5;
  const maxRounds = opts.maxRounds ?? 60;
  const angleTol = opts.angleTol ?? 1e-9;
  const tauOf = (p: ArrayLike<number>): Vec2 => modulus(triang, p).tau;   // RAW Teichmüller τ
  const dist = (t: Vec2): number => Math.hypot(t[0] - target[0], t[1] - target[1]);

  const onRound = opts.onRound;

  return (x) => {
    if (project(x, held).status !== 'converged') return null;   // re-flatten
    if (!isEmbedded(triang, x)) return null;                    // must START embedded — gated, can't enter

    onRound?.(tauOf(x), 0);                                      // initial modulus
    for (let round = 0; round < maxRounds; round++) {
      const before = dist(tauOf(x));
      if (before < modulusTol) break;                            // reached τ₀
      const tc = tauOf(x);                                       // fatten while HOLDING the modulus, so deepening
      minimize(x, [flat(triang), pinTeichmuller(triang, point([tc[0], tc[1]]))], barrier, { region, maxIters: 300 }); // clearance can't drift τ away from τ₀ (measured: a free fatten does, and stalls the march)
      const geo = hyperbolicGeodesic(tauOf(x), target);          // geodesic from the (fattened) current τ
      const family: Family = {
        param: (q) => geo.fraction(tauOf(q)),
        held: (_q, s) => [flat(triang), pinTeichmuller(triang, point(geo.point(s)))],
      };
      continuation(x, family, 1, { region });                    // march as far as this margin allows (~one hop)
      onRound?.(tauOf(x), round + 1);                            // modulus after this round
      if (before - dist(tauOf(x)) < progressTol) break;          // a full round made no headway → pinched
    }

    const m = measure(triang, x);
    const reached = dist(m.tau) < modulusTol;
    return m.coneDeficit < angleTol && m.embedded && reached ? m : null;
  };
}
