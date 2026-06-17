/**
 * The shared discovery recipe both `discover` and `wall` are instances of:
 *
 *   seed → project(held) → flow(held, energy, region = embedded) → certify
 *
 * Hold a set of closed conditions `held` (built per seed, so a frozen-chart wall
 * can capture the seed), descend a repulsion `energy` ALONG that manifold gated by
 * embeddedness, and accept by `accept(certificate)`. The two searches differ only
 * in `held` and `accept`:
 *   - discover : held = [flat]                 accept = flat ∧ embedded
 *   - wall(c)  : held = [flat, modulusWall(c)] accept = flat ∧ |Re τ̂|=c ∧ embedded
 *
 * `flow` tangent-projects the energy gradient onto the kernel of the *stacked*
 * `held` Jacobian, so descent stays on the whole locus (flat, and the wall if held)
 * while moving toward embeddedness. Mutates the seed buffer in place.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { ScalarFn } from '../functions/types.ts';
import type { Constraint } from '../solvers/types.ts';
import { identity } from '../configuration/chart.ts';
import { embedded } from '../conditions/embedded/index.ts';
import { project } from '../solvers/project.ts';
import { flow } from '../solvers/flow.ts';
import { certify, type Certificate } from './certify.ts';

export interface FlowSearchOptions {
  /** The repulsion energy to descend toward embeddedness (Fabi's chord²/cutOffArea). */
  energy: ScalarFn;
  /** Optional FATTENING energy descended after reaching embedded — a near-miss
   *  repulsion (`conditions/embedded/index`) that pushes the torus to a robust
   *  margin (Fabi's energy can't: it's zero on the embedded set). Holds `flat`,
   *  gated embedded. Gives later motion (e.g. `march`) room to move. */
  fattenEnergy?: ScalarFn;
  /** Flow tangent step length. Default 0.001. */
  stepSize?: number;
  /** Per-attempt cap on flow iterations. Default 500. */
  maxFlowIters?: number;
}

export function flattenFlowEmbed(
  torus: Triangulation,
  buildHeld: (seed: Float64Array) => readonly Constraint[],
  accept: (cert: Certificate) => boolean,
  opts: FlowSearchOptions,
): (seed: Float64Array) => Certificate | null {
  const chart = identity(torus.vertexCount * 3);
  const region = embedded(torus);
  const flowOpts = {
    region,
    stepSize: opts.stepSize ?? 0.001,
    maxIters: opts.maxFlowIters ?? 500,
    energyTol: 1e-12,
    gradientTol: 1e-12,
  };
  return (x) => {
    const held = buildHeld(x);            // [flat] or [flat, modulusWall(seed, c)]
    if (project(chart, x, held).status !== 'converged') return null;
    flow(chart, x, held, opts.energy, flowOpts);                   // reach embedded
    if (opts.fattenEnergy) flow(chart, x, held, opts.fattenEnergy, flowOpts); // fatten the margin
    const cert = certify(torus, x);
    return accept(cert) ? cert : null;
  };
}
