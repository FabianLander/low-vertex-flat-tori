/**
 * march — continuation along a 1-parameter family of submanifolds M_s, staying
 * inside an open region Ω. The tool to REACH (or track) a target that one
 * projection can't hit because Ω is tiny and M_s is far: walk there in adaptive
 * substeps, re-projecting and re-gating each step.
 *
 * It is pure corrector-continuation (no bespoke numerics): at parameter value s,
 * the corrector is `project` onto the family's held submanifolds rebuilt at the
 * current point (so frozen charts — e.g. the modulus chart — re-freeze each step).
 *   - advance s toward the target by `step`;
 *   - `project` onto M_s; if it converges AND stays in Ω, accept and grow `step`;
 *   - else restore, halve `step`; after too many consecutive halvings the path is
 *     pinched off → return `'blocked'` (a RESULT — where Ω closes — not a failure).
 *
 * Mutates `x` (chart coords) in place. Pure: no three.js, no DOM. Reuses the
 * `project` corrector verbatim — same J-hub.
 */

import { project, type ProjectOptions } from './project.ts';
import type { Chart, Constraint, Region } from './types.ts';

/**
 * A 1-parameter family of submanifolds. `param` reads the current parameter value
 * off a config (e.g. |Re τ̂|); `held` builds the submanifolds pinning the family to
 * value `s`, with any frozen charts captured at the passed config `c` (so each
 * substep re-freezes locally — that's what keeps the modulus chart valid).
 */
export interface Family {
  param(c: ArrayLike<number>): number;
  held(c: ArrayLike<number>, s: number): readonly Constraint[];
}

export type MarchStatus = 'reached' | 'blocked' | 'max-iters';

export interface MarchOptions {
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
   *  short of the target, the path is pinched → `'blocked'`. Catches the smooth
   *  pinch where feasible steps shrink to zero. Default 1e-7. */
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
  chart: Chart,
  x: Float64Array,
  family: Family,
  target: number,
  opts: MarchOptions = {},
): MarchResult {
  const n = chart.ambient;
  const maxHalvings = opts.maxHalvings ?? 24;
  const maxSteps = opts.maxSteps ?? 1000;
  const minStep = opts.minStep ?? 1e-4;
  const reachTol = opts.tol ?? 1e-9;
  const stallStep = opts.stallStep ?? 1e-7;
  const region = opts.region;
  const projectOpts = opts.projectOpts ?? { damping: opts.damping ?? 1e-12 };

  const c = new Float64Array(n);
  const saved = new Float64Array(chart.dim);

  chart.realize(x, c);
  let cur = family.param(c);
  let step = Math.max(Math.abs(target - cur) / 8, minStep);
  let halvings = 0;

  for (let iter = 0; iter < maxSteps; iter++) {
    if (Math.abs(target - cur) <= reachTol) return { status: 'reached', param: cur, iters: iter };

    const remaining = target - cur;
    const next = Math.abs(remaining) <= step * 1.5 ? target : cur + Math.sign(remaining) * step;

    saved.set(x);
    chart.realize(x, c);
    const held = family.held(c, next);          // re-freeze the family at the current point
    let ok = project(chart, x, held, projectOpts).status === 'converged';
    if (ok && region) { chart.realize(x, c); ok = region.contains(c); }

    if (ok) {
      chart.realize(x, c);
      const newCur = family.param(c);            // measured (accounts for chart drift)
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
