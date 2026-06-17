/**
 * collect — the rejection-sampling search driver. Draw seeds, run an `attempt`
 * recipe on each, keep the ones it certifies. This is the whole control flow a
 * discovery search needs; everything problem-specific lives in the two callbacks
 * (`drawSeed`, `attempt`) and everything IO-specific in `onAccept`/`onTry`, so the
 * driver itself is pure — no files, no torus, no conditions.
 *
 *   while not done:
 *     seed = drawSeed()                 // null ⇒ source exhausted, stop
 *     cert = attempt(seed)              // runs project/flow/…; mutates seed in place
 *     if cert: accept (onAccept), else: reject
 *
 * `attempt` returns a result `R` to accept or `null` to reject; on accept the
 * `seed` buffer holds the accepted configuration (copy it in `onAccept` if you
 * persist it — the buffer may be reused on the next draw). `R` is usually a
 * `Certificate`, but a search may return a richer record (e.g. a `march` outcome
 * carrying reached/blocked + the pinch modulus) — `collect` only cares that it is
 * non-null.
 *
 * Pure: no three.js, no DOM.
 */

export interface CollectStats {
  tries: number;
  accepts: number;
  rejects: number;
}

export interface CollectOptions<R> {
  /** Stop after this many attempts. Default ∞. */
  maxTries?: number;
  /** Stop after this many accepts. Default ∞. */
  maxAccepts?: number;
  /** Each accepted attempt: the result and the live config buffer (copy to persist). */
  onAccept?: (result: R, positions: Float64Array) => void;
  /** Every attempt (accept or reject): for progress, closeness scoring, etc. */
  onTry?: (accepted: boolean, positions: Float64Array, stats: Readonly<CollectStats>) => void;
}

export function collect<R>(
  drawSeed: () => Float64Array | null,
  attempt: (seed: Float64Array) => R | null,
  opts: CollectOptions<R> = {},
): CollectStats {
  const maxTries = opts.maxTries ?? Infinity;
  const maxAccepts = opts.maxAccepts ?? Infinity;
  const stats: CollectStats = { tries: 0, accepts: 0, rejects: 0 };

  while (stats.tries < maxTries && stats.accepts < maxAccepts) {
    const seed = drawSeed();
    if (seed === null) break;
    stats.tries++;
    const result = attempt(seed);
    if (result !== null && result !== undefined) {
      stats.accepts++;
      opts.onAccept?.(result, seed);
    } else {
      stats.rejects++;
    }
    opts.onTry?.(result !== null && result !== undefined, seed, stats);
  }
  return stats;
}
