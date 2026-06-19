/**
 * Held normalization — collapse a `Constraint` (a bare `Fn`, or an `Fn` + usage)
 * into the precomputed form the steppers consume: the map, how many leading rows
 * to drive, an optional custom convergence measure, and reusable scratch buffers.
 *
 * `project` and `flow` both build the stacked driving Jacobian from these; `march`
 * delegates to `project`. Pure: no three.js, no DOM.
 */

import { infNorm } from './linalg.ts';
import type { Fn } from '@core/functions/types.ts';
import type { Constraint, Held } from '@core/constraints/types.ts';

export interface NormHeld {
  readonly fn: Fn;
  /** Rows of `fn` actually driven by the step (≤ fn.dim). */
  readonly drive: number;
  /** Custom convergence measure, if any; else ‖value‖∞ over all fn.dim rows. */
  readonly custom?: (c: ArrayLike<number>) => number;
  /** Scratch for the full value (length fn.dim). */
  readonly valueBuf: Float64Array;
  /** Scratch for the full Jacobian (fn.dim × n). */
  readonly jacBuf: Float64Array;
}

const isHeld = (c: Constraint): c is Held => 'fn' in c;

/** Normalize one constraint against the ambient dimension n. */
export function normHeld(c: Constraint, n: number): NormHeld {
  const fn = isHeld(c) ? c.fn : c;
  return {
    fn,
    drive: (isHeld(c) ? c.drive : undefined) ?? fn.dim,
    custom: isHeld(c) ? c.measure : undefined,
    valueBuf: new Float64Array(fn.dim),
    jacBuf: new Float64Array(fn.dim * n),
  };
}

/** Total number of driven rows across a set of normalized constraints. */
export function totalDrive(hs: readonly NormHeld[]): number {
  let k = 0;
  for (const h of hs) k += h.drive;
  return k;
}

/** Convergence residual of one normalized constraint at config `c` (value buffer
 *  is filled as a side effect, so `project` can reuse it for the driving rows). */
export function residualOf(h: NormHeld, c: ArrayLike<number>): number {
  h.fn.value(c, h.valueBuf);
  return h.custom ? h.custom(c) : infNorm(h.valueBuf);
}
