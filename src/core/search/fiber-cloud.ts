/**
 * fiberCloud — explore the fiber {flat ∧ τ = τ₀} ∩ Ω and find how DEEP into the embedded
 * region it reaches: a set of ROAMERS wandering the fiber, plus a hall of fame of the
 * fattest shapes any of them has seen.
 *
 * The fiber of `τ` over τ₀ is 15-dimensional in ℝ³ⱽ (Lander, Thm. 3). The routine runs in the
 * `normalized` chart, which quotients out translation, rotation and scale — 3V−7 coordinates,
 * so the shape fiber is 8-dimensional. That is not just tidiness: both held conditions are
 * scale-invariant, so the unquotiented fiber is a CONE, and an unquotiented walk would spend
 * much of its budget sliding along directions that change no shape and no clearance.
 *
 * FATNESS is `clearance` — distance to the nearest crossing over √area, so it is scale-free
 * and comparable across that cone. `measure` already returns it, which is what makes a trial
 * cheap (~0.3 ms: perturb, `project` onto the 9 rows {δ₀…δ₆, Re τ, Im τ}, verify).
 *
 * WHAT THE GEOMETRY ACTUALLY LOOKS LIKE (measured on the square fiber at τ = i, from the
 * inflated fold). Three things, each of which killed a more obvious design:
 *
 *   1. Staying ON the fiber is free; staying INSIDE Ω is the entire difficulty. Of 200 trial
 *      jumps at σ ≥ 0.05, `project` failed 0 times, flatness 0, the modulus 0 — and
 *      embeddedness ALL of them. So there is no point steering by the constraints.
 *   2. Stepping inside the tangent space (ker J) does NOT buy bigger steps. It moves ~50%
 *      further per accepted step than isotropic jitter, but hits the same wall at σ ≈ 0.05,
 *      because that wall is Ω, not the fiber.
 *   3. The embedded pocket is LONG AND THIN, not small. One jump of 0.05 almost always exits
 *      it, yet an UNSELECTED random walk of σ = 0.01 steps travels distance ~0.39 from the
 *      seed — 15× the diameter an elitist beam ever reaches, and 8× the single-jump wall.
 *
 * Hence roamers. An elitist beam ranked on clearance pins its whole population inside a
 * σ-sized ball around the current champion, because it never keeps a slightly thinner torus
 * that has TRAVELLED; measured, its population diameter sits at ~2.5e-2 from generation 1 to
 * 600 while the reachable pocket is ~0.39 across. So the walkers here are NOT selected: every
 * verified step is taken, thin ones included, and selection happens only in the hall of fame,
 * which records the fattest shapes seen without ever constraining where the walkers go. A
 * walker that gets stuck (too many consecutive rejections — a thin dead end) teleports to a
 * random hall entry, which is the only exploitation in the loop. Measured against the elitist
 * beam at an equal 40 k trials: 3.17e-3 → 3.53e-3 on the square, 6.9e-4 → 8.3e-4 on the
 * hexagonal. For comparison, a gated `cellBarrier` descent costs ~3.6 s and plateaus at 1.8e-3.
 *
 * This is a STATEFUL driver, not the usual `(seed) => Measurement | null` attempt: the point is
 * to watch it explore, so `step` runs a bounded batch and returns, and a demo can drive it a
 * frame at a time. As always the search only *thinks* it is on the fiber — every member here
 * has been through `measure`; re-verify anything you keep.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import { normalized } from '@core/coordinates/normalized.ts';
import { flat } from '@core/constraints/flat.ts';
import { pinTeichmuller, point } from '@core/constraints/modulus.ts';
import { project } from '@core/solvers/project.ts';
import { mulberry32 } from '@core/sampling/rng.ts';
import { pullHeld } from './pull.ts';
import { measure } from './measure.ts';
import { volumeRatio, squash } from './shape.ts';

export interface CloudMember {
  /** Chart coordinates (the `normalized` slice — similarity already quotiented out). */
  readonly x: Float64Array;
  /** Realized positions in ℝ³, length 3V. */
  readonly positions: Float64Array;
  /** Distance to the nearest crossing over √area — how far from self-intersecting. */
  readonly clearance: number;
  /** |enclosed volume| / area^{3/2} — how inflated (0 ⟺ planar, 0.0940 ⟺ sphere). */
  readonly volumeRatio: number;
  /** smallest / largest principal extent — how far from lying in a plane. */
  readonly squash: number;
  /** The value the hall of fame is ranked by, per the chosen objective. */
  readonly score: number;
}

/**
 * What "best" means. These are genuinely DIFFERENT targets, not proxies for one another
 * (measured: an archive search that improved volumeRatio by 22% over a clearance-driven
 * roamer simultaneously LOST 9% of its clearance).
 *
 *   'clearance'  furthest from self-intersecting — the embedding-theoretic notion of fat.
 *   'inflation'  most enclosed air per unit area — the "would hold its shape as paper" notion.
 *   'nonplanar'  furthest from lying in a plane. The widest dynamic range of the three.
 *   'balanced'   the geometric mean of normalized clearance and inflation, for the trade-off.
 *
 * Hunting a VISIBLE HOLE is deliberately not one of them. `shape.holeSize` is exactly 0 on
 * every closed torus, so it cannot be climbed, and scoring it costs ~25 ms against ~0.3 ms
 * here — which slowed the walk ~80× to compute a number an unselected roamer never reads.
 * The right shape is to roam on a cheap objective and detect holes on a separate schedule;
 * `demos/hole-hunt` does exactly that.
 */
export type CloudObjective = 'clearance' | 'inflation' | 'nonplanar' | 'balanced';

/**
 * How the search moves. WHICH ONE WINS DEPENDS ON THE OBJECTIVE — measured, and the two
 * results point opposite ways, so this is not a knob to leave on a default and forget:
 *
 *   'roam'   walkers take UNSELECTED steps; selection lives only in the hall of fame. Best
 *            for `'clearance'`, by a wide margin at every budget tested (1.5M trials: 3.66e-3
 *            vs 3.44e-3 square, 1.53e-3 vs 1.01e-3 hexagonal, with roaming converged by 40%
 *            of the run and climbing still crawling). Finding deep clearance is a hunt for
 *            pockets, and selection pins the population in a σ-ball around the champion.
 *   'climb'  an elitist beam: every trial perturbs a random hall member, so the population is
 *            always the best-so-far. Best for `'inflation'` (400k trials: 1.85e-2 vs 1.43e-2
 *            square, 1.39e-2 vs 1.21e-2 hexagonal). Inflation is a smooth climb rather than a
 *            search for hidden pockets, so pressure pays.
 *
 * A gated gradient ascent of the same objective was also tried and is not offered: it stalls
 * at the seed immediately, the tangent step blocked by the region gate.
 */
export type CloudStrategy = 'roam' | 'climb';

export interface FiberCloudOptions {
  /** Roamers wandering the fiber at once. Default 12. */
  walkers?: number;
  /** How many fattest-ever shapes to remember. Default 60. */
  hallSize?: number;
  /** Trial steps per `step()` call. Default 60. */
  trialsPerStep?: number;
  /** Step sizes, drawn uniformly per trial. Kept small deliberately: accept rate is ~85% at
   *  0.01 and ~0% by 0.05, and the wall is Ω, so distance is won by CHAINING small steps. */
  sigmas?: readonly number[];
  /** Consecutive rejections before a stuck walker teleports to a hall entry. Default 400. */
  staleLimit?: number;
  /** Accept threshold on max|2π−θ|. Default 1e-10. */
  angleTol?: number;
  /** Accept threshold on |τ − τ₀|. Default 1e-9. */
  modulusTol?: number;
  /** RNG seed. Default 1. */
  seed?: number;
  /**
   * Hold the modulus at `target` (the default). Turn it OFF to let the search leave the fiber
   * and wander the whole flat locus — the right choice when hunting something the fiber may
   * simply not contain, like a visible hole: flatness and embeddedness still hold, but τ is
   * free to drift, and `measure` records where it went.
   */
  holdModulus?: boolean;
  /** What the hall of fame ranks by. Default `'clearance'`. */
  objective?: CloudObjective;
  /** How the search moves. Default `'roam'`; use `'climb'` for `'inflation'`. */
  strategy?: CloudStrategy;
  /**
   * Reject any shape whose clearance falls below this. Zero (the default) means the only
   * requirement is the embedded gate itself. Raise it when chasing `'inflation'`: inflation
   * and clearance are strongly antagonistic, so an unconstrained inflation hunt walks the
   * torus right up against touching itself, where the shape is numerically fragile and no
   * more foldable than a flat one. Sweeping this floor traces the inflation/robustness
   * trade-off — the most inflated torus available at each level of structural margin.
   *
   * NOTE the seed is exempt: it has to be in the hall for the search to have somewhere to
   * start. If the seed itself is thinner than the floor, check `seedMeetsFloor` — until the
   * search finds something that clears the bar, `best` is still the (non-compliant) seed.
   */
  minClearance?: number;
}

export interface FiberCloud {
  /** The fattest shape seen so far. */
  readonly best: CloudMember;
  /** The hall of fame, fattest first. */
  readonly hall: readonly CloudMember[];
  /** Where the roamers currently are (chart coords), for showing the spread. */
  readonly walkers: readonly Float64Array[];
  /** One roamer's CURRENT realization in ℝ³ — where the search actually is right now.
   *  Watch this rather than `best` when the score is flat across most of the space: a score
   *  that never displaces a hall entry leaves `best` sitting still while the walk is in fact
   *  moving, which reads as a stuck search when it is not. */
  walkerPositions(i: number): Float64Array;
  /** How far each roamer has got from the seed, in the chart. */
  walkerDistances(): number[];
  readonly seedClearance: number;
  /** The seed's score under the chosen objective, for the gain ratio. */
  readonly seedScore: number;
  readonly objective: CloudObjective;
  readonly strategy: CloudStrategy;
  /** The clearance floor in force, if any. */
  readonly minClearance: number;
  readonly holdModulus: boolean;
  /** False when the seed is thinner than `minClearance` — then a `best` equal to the seed
   *  means the search never found anything meeting the floor, not that the seed is optimal. */
  readonly seedMeetsFloor: boolean;
  readonly tries: number;
  readonly accepted: number;
  readonly generation: number;
  /** Run one batch of trials. True if `best` improved. */
  step(): boolean;
  /** Restart from a configuration (length 3V). */
  reset(positions: ArrayLike<number>): void;
}

/**
 * Start a cloud on the fiber over `target` from one embedded flat seed. The seed must already
 * be flat, embedded and at τ₀ — this DEEPENS a fiber it is already on, it does not find one.
 */
export function fiberCloud(
  triang: Triangulation,
  target: Vec2,
  seedPositions: ArrayLike<number>,
  opts: FiberCloudOptions = {},
): FiberCloud {
  const space = normalized(triang);
  const holdModulus = opts.holdModulus ?? true;
  const held = pullHeld(space, holdModulus
    ? [flat(triang), pinTeichmuller(triang, point(target))]
    : [flat(triang)]);
  const nWalkers = opts.walkers ?? 12;
  const hallSize = opts.hallSize ?? 60;
  const trials = opts.trialsPerStep ?? 60;
  const sigmas = opts.sigmas ?? [0.005, 0.01, 0.02];
  const staleLimit = opts.staleLimit ?? 400;
  const angleTol = opts.angleTol ?? 1e-10;
  const modulusTol = opts.modulusTol ?? 1e-9;
  const minClearance = opts.minClearance ?? 0;
  const rng = mulberry32(opts.seed ?? 1);
  const objective = opts.objective ?? 'clearance';
  const strategy = opts.strategy ?? 'roam';
  const amb = new Float64Array(space.ambient);

  // The objectives live on different scales, so 'balanced' compares each against a reference
  // value taken from the inflated folded bases rather than against the other directly.
  const CLEARANCE_REF = 3.5e-3, INFLATION_REF = 1.0e-2;
  function scoreOf(clearance: number, vol: number, sq: number): number {
    switch (objective) {
      case 'inflation': return vol;
      case 'nonplanar': return sq;
      case 'balanced': return Math.sqrt((clearance / CLEARANCE_REF) * (vol / INFLATION_REF));
      default: return clearance;
    }
  }

  /** Perturb, re-solve onto {flat ∧ τ = τ₀}, and return a verified embedded member. */
  function trial(from: Float64Array, sigma: number): CloudMember | null {
    const x = from.slice();
    for (let j = 0; j < x.length; j++) x[j] += sigma * (rng() * 2 - 1);
    if (project(x, held).status !== 'converged') return null;
    space.push(x, amb);
    const m = measure(triang, amb);
    if (m.coneDeficit > angleTol || !m.embedded) return null;
    if (m.clearance < minClearance) return null;
    if (holdModulus && Math.hypot(m.tau[0] - target[0], m.tau[1] - target[1]) > modulusTol) return null;
    const positions = amb.slice();
    const vol = volumeRatio(triang, positions);
    const sq = squash(positions);
    return { x, positions, clearance: m.clearance, volumeRatio: vol, squash: sq,
      score: scoreOf(m.clearance, vol, sq) };
  }

  let roamers: { x: Float64Array; stale: number }[] = [];
  let hall: CloudMember[] = [];
  let origin = new Float64Array(space.dim);
  let seedClearance = 0, seedScore = 0;
  let tries = 0, accepted = 0, generation = 0;

  function reset(seed: ArrayLike<number>): void {
    const x = new Float64Array(space.dim);
    space.coords(seed, x);
    space.push(x, amb);
    const m = measure(triang, amb);
    origin = x.slice();
    seedClearance = m.clearance;
    const positions = amb.slice();
    const vol = volumeRatio(triang, positions);
    const sq = squash(positions);
    seedScore = scoreOf(m.clearance, vol, sq);
    hall = [{ x, positions, clearance: m.clearance, volumeRatio: vol, squash: sq, score: seedScore }];
    roamers = Array.from({ length: nWalkers }, () => ({ x: x.slice(), stale: 0 }));
    tries = 0; accepted = 0; generation = 0;
  }
  reset(seedPositions);

  return {
    get best() { return hall[0]; },
    get hall() { return hall; },
    get walkers() { return roamers.map((w) => w.x); },
    walkerPositions(i) {
      const w = roamers[i % roamers.length];
      const out = new Float64Array(space.ambient);
      space.push(w.x, out);
      return out;
    },
    walkerDistances() {
      return roamers.map((w) => {
        let s = 0;
        for (let i = 0; i < w.x.length; i++) s += (w.x[i] - origin[i]) ** 2;
        return Math.sqrt(s);
      });
    },
    get seedClearance() { return seedClearance; },
    get seedScore() { return seedScore; },
    get objective() { return objective; },
    get strategy() { return strategy; },
    get minClearance() { return minClearance; },
    get holdModulus() { return holdModulus; },
    get seedMeetsFloor() { return seedClearance >= minClearance; },
    get tries() { return tries; },
    get accepted() { return accepted; },
    get generation() { return generation; },
    step() {
      const before = hall[0].score;
      for (let i = 0; i < trials; i++) {
        // 'climb' always breeds from the best-so-far; 'roam' continues a walker's own path
        const w = roamers[i % roamers.length];
        const from = strategy === 'climb' ? hall[Math.floor(rng() * hall.length)].x : w.x;
        tries++;
        const kid = trial(from, sigmas[Math.floor(rng() * sigmas.length)]);
        if (!kid) {
          // a thin dead end: after enough refusals, jump to a remembered good shape
          if (strategy === 'roam' && ++w.stale > staleLimit && hall.length) {
            w.x = hall[Math.floor(rng() * hall.length)].x.slice();
            w.stale = 0;
          }
          continue;
        }
        accepted++;
        if (strategy === 'roam') { w.x = kid.x; w.stale = 0; }   // UNSELECTED: every verified step taken
        if (hall.length < hallSize || kid.score >= hall[hall.length - 1].score) {
          hall.push(kid);
          hall.sort((a, b) => b.score - a.score);
          if (hall.length > hallSize) hall.pop();
        }
      }
      generation++;
      return hall[0].score > before;
    },
    reset,
  };
}
