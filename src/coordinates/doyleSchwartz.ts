/**
 * The Doyle–Schwartz parametric family — an explicit seed configuration for the
 * degree-6-regular (#7) flat torus of any modulus τ = x + iy.
 *
 * Every member is a symmetric semi-solution (in fact an embedded flat torus):
 * the six planar vertices P1..P6 lie in z = 0 and are collinear in two triples
 * {P1,P2,P3}, {P4,P5,P6}; the two tent-pole vertices P0, P7 sit at height
 * y·√(8x) ≥ 0 with the ρ-symmetry P7 = ρ(P0), ρ(u,v,w) = (−u,−v,w); and all cone
 * angles equal 2π. It is the canonical starting point for the semi-solution
 * search (perturb the tent poles, then `project` onto flat ∧ collinear).
 *
 * Returns bare positions (24 floats, [x0,y0,z0, …, x7,y7,z7]) — a configuration
 * is a `Float64Array`. Formulas from Doyle–Schwartz [DS25] §2.2 (eq. 2). The DS
 * fundamental domain is x ≥ 0, x ≤ ½, (x−1)² + y² ≥ 1.
 *
 * Pure: no three.js, no DOM.
 */

/** Doyle–Schwartz vertex positions for modulus z = x + iy (24 floats). */
export function doyleSchwartzPositions(x: number, y: number): Float64Array {
  const p = new Float64Array(24);
  const x2 = x * x, y2 = y * y;
  const ztop = Math.sqrt(8 * x) * y;
  // P0
  p[0]  = x - 2 * x2;       p[1]  = y - 2 * x * y;  p[2]  = ztop;
  // P1
  p[3]  = x - x2 - y2;      p[4]  = -y;              p[5]  = 0;
  // P2
  p[6]  = 2 * x - x2 - y2;  p[7]  = 0;               p[8]  = 0;
  // P3
  p[9]  = 3 * x - x2 - y2;  p[10] = y;               p[11] = 0;
  // P4
  p[12] = -3 * x + x2 + y2; p[13] = -y;              p[14] = 0;
  // P5
  p[15] = -2 * x + x2 + y2; p[16] = 0;               p[17] = 0;
  // P6
  p[18] = -x + x2 + y2;     p[19] = y;               p[20] = 0;
  // P7
  p[21] = 2 * x2 - x;       p[22] = 2 * x * y - y;  p[23] = ztop;
  return p;
}
