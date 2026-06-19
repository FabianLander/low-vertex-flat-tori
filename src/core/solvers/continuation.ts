/**
 * continuation — track a 1-parameter family of submanifolds M_s, staying inside an open
 * `Region`. The tool to REACH (or track) a target that one projection can't hit because the
 * region is tiny and M_s is far: walk there in adaptive substeps, re-projecting and
 * re-checking the region each step. Run directly in the working space ℝⁿ — the `Family` and
 * the `Region` are both ℝⁿ-facing (the family pushes to ℝ³ⱽ internally when it needs an
 * ambient quantity, e.g. the modulus).
 *
 * Corrector-continuation (natural parameter): at parameter value s, the corrector is
 * `project` onto the family's submanifolds rebuilt at the current point (so frozen charts —
 * e.g. the modulus chart — re-freeze each step).
 *   - advance s toward the target by `step`;
 *   - `project` onto M_s; if it converges AND stays in the region, accept and grow `step`;
 *   - else restore, halve `step`; after too many consecutive halvings the path is pinched
 *     off → return `'blocked'` (a RESULT — where the region closes — not a failure).
 *
 * (A tangent predictor — predict along the curve before correcting — is the planned upgrade;
 * see docs/solvers-overhaul.md.)
 *
 * Mutates `x` in place. Pure: no three.js, no DOM. Reuses `project` verbatim.
 */

import { project, type ProjectOptions } from './project.ts';
import type { Family } from './types.ts';
import type { Region } from '@core/embedding/index.ts';

export type ContinuationStatus = 'reached' | 'blocked' | 'max-iters';

export interface ContinuationOptions {
  /** Open region to stay inside each substep. */
  region?: Region;
  /** Consecutive halvings before declaring the path blocked. Default 24. */
  maxHalvings?: number;
  /** Hard cap on substeps. Default 1000. */
  maxSteps?: number;
  /** Smallest initial substep (in parameter units). Default 1e-4. */
  minStep?: number;
  /** Reached when |target − param| ≤ this. Default 1e-9. */
  tol?: number;
  /** If a successful step advances the parameter by less than this while still
   *  short of the target, the path is pinched → `'blocked'`. Default 1e-7. */
  stallStep?: number;
  /** Options forwarded to each `project` corrector. */
  projectOpts?: ProjectOptions;
}

export interface ContinuationResult {
  status: ContinuationStatus;
  /** The parameter value actually reached (where it stopped / blocked). */
  param: number;
  iters: number;
}

export function continuation(
  x: Float64Array,
  family: Family,
  target: number,
  opts: ContinuationOptions = {},
): ContinuationResult {
  const maxHalvings = opts.maxHalvings ?? 24;
  const maxSteps = opts.maxSteps ?? 1000;
  const minStep = opts.minStep ?? 1e-4;
  const reachTol = opts.tol ?? 1e-9;
  const stallStep = opts.stallStep ?? 1e-7;
  const region = opts.region;
  const projectOpts = opts.projectOpts ?? {};

  const saved = new Float64Array(x.length);

  let cur = family.param(x);
  let step = Math.max(Math.abs(target - cur) / 8, minStep);
  let halvings = 0;

  for (let iter = 0; iter < maxSteps; iter++) {
    if (Math.abs(target - cur) <= reachTol) return { status: 'reached', param: cur, iters: iter };

    const remaining = target - cur;
    const next = Math.abs(remaining) <= step * 1.5 ? target : cur + Math.sign(remaining) * step;

    saved.set(x);
    const held = family.held(x, next);          // re-freeze the family at the current point
    let ok = project(x, held, projectOpts).status === 'converged';
    if (ok && region) ok = region.contains(x);

    if (ok) {
      const newCur = family.param(x);            // measured (accounts for chart drift)
      const advanced = Math.abs(newCur - cur);
      cur = newCur;
      // Pinched: a feasible step now moves the parameter negligibly, yet we're not
      // at the target — the region has closed the path off here.
      if (advanced < stallStep && Math.abs(target - cur) > stallStep) {
        return { status: 'blocked', param: cur, iters: iter };
      }
      step *= 1.5;
      halvings = 0;                              // reset: a success means the path is open here
    } else {
      x.set(saved);
      step *= 0.5;
      if (++halvings > maxHalvings) return { status: 'blocked', param: cur, iters: iter };
    }
  }

  return { status: 'max-iters', param: cur, iters: maxSteps };
}
