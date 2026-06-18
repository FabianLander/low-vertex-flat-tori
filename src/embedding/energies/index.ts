/**
 * The embeddedness energies — scalar potentials `flow` descends. Each measures
 * un-embeddedness (or near-miss) and you only ever minimize them; they are the
 * FORCES (optimization surrogates — choices, not canonical), in two families:
 *   overlap  — drive a CROSSING torus onto Ω    (`./overlap`)
 *   fatten   — push an EMBEDDED torus deeper in  (`./fatten`)
 */

export { makeChordLengthSquared, makeCutOffArea } from './overlap.ts';
export {
  makeCellMargin, makeCellBarrier,
  type CellMarginOptions, type CellBarrierOptions,
} from './fatten.ts';
