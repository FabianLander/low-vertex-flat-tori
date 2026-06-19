/**
 * The solver kernel — the dense linear algebra every stepper rests on, from ONE economy
 * QR of the transposed constraint Jacobian. With `Jᵀ = Q R` (Q's columns an orthonormal
 * basis of the row space of `J`, `R` upper-triangular) both moves the steppers need fall
 * straight out:
 *   • the min-norm Gauss–Newton step   `s = Q R⁻ᵀ b`  (min-norm solution of `J s = b`), and
 *   • the tangent projection           `P_T v = v − Q Qᵀ v`  (project off the row space of J).
 *
 * QR conditions at `κ(J)`, not the `κ(J)²` of the old normal-equations (`JJᵀ`) solve — the
 * measured reason for the switch (see docs/solvers-overhaul.md). Callers pass a full-row-rank
 * `J` (e.g. `flat` supplies its V−1 independent rows), so plain modified Gram–Schmidt suffices;
 * a column that collapses sets `fullRank = false`.
 *
 * Pure: no three.js, no DOM.
 */

/** ‖v‖∞ — the largest absolute component. */
export function infNorm(v: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < v.length; i++) {
    const a = Math.abs(v[i]);
    if (a > m) m = a;
  }
  return m;
}

const TINY = 1e-30;        // absolute floor for a divisor
const REL = 1e-12;         // a column collapses when ‖after orthogonalization‖ < REL·‖before‖
                           // (catches roundoff-scale dependence ~1e-16, leaves ill-conditioned-
                           //  but-independent columns — ratio ~1/κ — intact)

/**
 * A reusable QR workspace: the factorization of `Jᵀ` for a `rows`×`cols` Jacobian `J`
 * (rows = number of driven constraint rows, cols = working dimension). Allocate once per
 * solve, refactor each iteration. `Q` holds the `rows` orthonormal vectors (vector k in
 * `Q[k*cols .. k*cols+cols)`); `R` is `rows`×`rows` upper-triangular; `y` is solve scratch.
 */
export interface QR {
  readonly Q: Float64Array;
  readonly R: Float64Array;
  readonly y: Float64Array;
  rows: number;
  readonly cols: number;
  fullRank: boolean;
}

export function makeQR(rows: number, cols: number): QR {
  return { Q: new Float64Array(rows * cols), R: new Float64Array(rows * rows), y: new Float64Array(rows), rows, cols, fullRank: true };
}

/** Factor `Jᵀ` by modified Gram–Schmidt: `J` is `rows`×`cols` row-major, so its rows are
 *  the columns of `Jᵀ`. Fills `qr.Q` (the orthonormal vectors) and `qr.R` (upper). */
export function qrFactor(qr: QR, J: ArrayLike<number>, rows: number, cols: number): void {
  const { Q, R } = qr;
  qr.rows = rows;
  qr.fullRank = true;
  for (let k = 0; k < rows; k++) {
    const qk = k * cols;
    let nrm0 = 0;
    for (let c = 0; c < cols; c++) { const a = J[k * cols + c]; Q[qk + c] = a; nrm0 += a * a; } // J's k-th row
    nrm0 = Math.sqrt(nrm0);
    for (let j = 0; j < k; j++) {                                     // orthogonalize against earlier vectors
      const qj = j * cols;
      let r = 0; for (let c = 0; c < cols; c++) r += Q[qj + c] * Q[qk + c];
      R[j * rows + k] = r;
      for (let c = 0; c < cols; c++) Q[qk + c] -= r * Q[qj + c];
    }
    let nrm = 0; for (let c = 0; c < cols; c++) nrm += Q[qk + c] * Q[qk + c];
    nrm = Math.sqrt(nrm);
    if (nrm > REL * nrm0) {                                           // independent column
      R[k * rows + k] = nrm;
      const inv = 1 / nrm; for (let c = 0; c < cols; c++) Q[qk + c] *= inv;
    } else {                                                         // collapsed: row is (numerically) dependent
      R[k * rows + k] = 0;
      for (let c = 0; c < cols; c++) Q[qk + c] = 0;
      qr.fullRank = false;
    }
  }
}

/** Min-norm solution `out` (length cols) of `J·s = b` (b length rows): `s = Q R⁻ᵀ b`. */
export function minNormSolve(qr: QR, b: ArrayLike<number>, out: Float64Array): void {
  const { Q, R, y, rows, cols } = qr;
  for (let i = 0; i < rows; i++) {                                   // forward-solve Rᵀ y = b
    let s = b[i];
    for (let j = 0; j < i; j++) s -= R[j * rows + i] * y[j];         // Rᵀ[i,j] = R[j,i]
    const d = R[i * rows + i];
    y[i] = d > TINY ? s / d : 0;
  }
  for (let c = 0; c < cols; c++) {                                   // out = Q y
    let s = 0;
    for (let k = 0; k < rows; k++) s += Q[k * cols + c] * y[k];
    out[c] = s;
  }
}

/** Tangent projection `out = v − Q Qᵀ v` (length cols) — project v off the row space of J.
 *  `out` may alias `v`. */
export function tangentApply(qr: QR, v: ArrayLike<number>, out: Float64Array): void {
  const { Q, y, rows, cols } = qr;
  for (let k = 0; k < rows; k++) {                                   // y = Qᵀ v
    let s = 0;
    for (let c = 0; c < cols; c++) s += Q[k * cols + c] * v[c];
    y[k] = s;
  }
  for (let c = 0; c < cols; c++) {                                   // out = v − Q y
    let s = v[c];
    for (let k = 0; k < rows; k++) s -= Q[k * cols + c] * y[k];
    out[c] = s;
  }
}

/** Convenience: factor `J` then project `v` onto its tangent (`out = P_T v`). The projection
 *  is always well-defined — a redundant row just contributes a collapsed (zero) column that
 *  the projection ignores — so there is no failure mode. */
export function tangentProject(qr: QR, J: ArrayLike<number>, rows: number, cols: number, v: ArrayLike<number>, out: Float64Array): void {
  qrFactor(qr, J, rows, cols);
  tangentApply(qr, v, out);
}
