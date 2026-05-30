/**
 * Interface for pluggable "repulsion" / "embeddedness" energy functions used
 * by the projected gradient flow in `src/math/embeddedFlow.ts`.
 *
 * An energy is anything that gives us a scalar measuring how far we are from
 * embedded, plus its gradient in position space. The flow takes a gradient
 * step then re-Newton-flattens; nothing else about the energy matters to the
 * flow, so any conforming implementation is plug-and-play.
 *
 * `compute` accepts ArrayLike<number> so it can be evaluated on staging
 * buffers without copying; `gradient` mutates a Float64Array out buffer to
 * avoid per-call allocation in tight loops.
 */
export interface RepulsionEnergy {
  /** Human-readable label for logging / picking from a registry. */
  readonly label: string;
  /** Scalar energy at `positions`. Zero ↔ embedded (for penalty-style energies). */
  compute(positions: ArrayLike<number>): number;
  /** Writes the 24-component gradient into `out`. `positions` may be mutated
   *  temporarily during the call (e.g. by FD implementations) but is restored. */
  gradient(positions: Float64Array, out: Float64Array): void;
}
