/**
 * march — continuation along a 1-parameter family of submanifolds M_s, staying
 * inside an open region. The tool to REACH (or track) a target that one projection
 * can't hit because the region is tiny and M_s is far: walk there in adaptive
 * substeps, re-projecting and re-gating each step. Run directly in the working space
 * ℝⁿ — the `Family` and the `Gate` are both ℝⁿ-facing (the family pushes to ℝ³ⱽ
 * internally when it needs an ambient quantity, e.g. the modulus).
 *
 * Pure corrector-continuation (no bespoke numerics): at parameter value s, the
 * corrector is `project` onto the family's held submanifolds rebuilt at the current
 * point (so frozen charts — e.g. the modulus chart — re-freeze each step).
 *   - advance s toward the target by `step`;
 *   - `project` onto M_s; if it converges AND passes the gate, accept and grow `step`;
 *   - else restore, halve `step`; after too many consecutive halvings the path is
 *     pinched off → return `'blocked'` (a RESULT — where the region closes — not a failure).
 *
 * Mutates `x` in place. Pure: no three.js, no DOM. Reuses `project` verbatim.
 */

import { project, type ProjectOptions } from './project.ts';
import type { Constraint } from '../conditions/types.ts';
import type { Gate } from './types.ts';

/**
 * A 1-parameter family of submanifolds, ℝⁿ-facing. `param` reads the current
 * parameter value off the working point (e.g. |Re τ̂|, pushing to ℝ³ⱽ internally);
 * `held` builds the submanifolds pinning the family to value `s`, AT the current
 * point `x`, returning constraints already in ℝⁿ (any frozen charts captured at the
 * pushed config, so each substep re-freezes locally).
 */
export interface Family {
  param(x: ArrayLike<number>): number;
  held(x: ArrayLike<number>, s: number): readonly Constraint[];
}

export type MarchStatus = 'reached' | 'blocked' | 'max-iters';

export interface MarchOptions {
  /** Open-region gate to stay inside each substep. */
  gate?: Gate;
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
  /** Damping for the project correctors. Default 1e-12. */
  damping?: number;
  /** Options forwarded to each `project`. Defaults to { damping }. */
  projectOpts?: ProjectOptions;
}

export interface MarchResult {
  status: MarchStatus;
  /** The parameter value actually reached (where it stopped / blocked). */
  param: number;
  iters: number;
}

export function march(
  x: Float64Array,
  family: Family,
  target: number,
  opts: MarchOptions = {},
): MarchResult {
  const maxHalvings = opts.maxHalvings ?? 24;
  const maxSteps = opts.maxSteps ?? 1000;
  const minStep = opts.minStep ?? 1e-4;
  const reachTol = opts.tol ?? 1e-9;
  const stallStep = opts.stallStep ?? 1e-7;
  const gate = opts.gate;
  const projectOpts = opts.projectOpts ?? { damping: opts.damping ?? 1e-12 };

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
    if (ok && gate) ok = gate(x);

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
