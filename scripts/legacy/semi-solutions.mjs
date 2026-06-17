/**
 * Scan for semi-solutions: flat immersions with P1..P6 in the XY-plane,
 * {P1,P2,P3} and {P4,P5,P6} each collinear, and all cone angles exactly 2π.
 *
 * For each (seed, perturbation) pair:
 *   1. Build the Doyle-Schwartz starting positions for the seed (x,y).
 *   2. Add the perturbation to P0 and P7 (breaking ρ-symmetry when non-zero).
 *   3. Run semiSolutionFlatten (constrained Newton with 9 constraints).
 *   4. If converged: print τ, embeddedness, and residuals as a CSV row.
 *
 * The zero perturbation at each seed recovers the symmetric DS solution
 * (which already satisfies all constraints) and validates the solver.
 * Non-zero perturbations explore the larger, non-symmetric semi-solution family.
 *
 * Output format (stdout, CSV):
 *   x_start, y_start, perturb_index, re_tau, im_tau, re_tau_reduced, im_tau_reduced,
 *   converged, embedded, cone_residual, collinear_residual
 *
 * Usage:
 *   npm run semi-solutions
 *   npm run semi-solutions -- 2>/dev/null   # suppress progress to stderr
 */

import { torus7 as torus } from '../../src/topology/torus7.ts';
import { scanSemiSolutions } from '../../src/math/semiSolution.ts';
import { doyleSchwartzPositions } from '../../src/configuration/doyleSchwartz.ts';
import { modulus, reduceModulus } from '../../src/topology/develop.ts';

// ---------------------------------------------------------------------------
// Seeds: points in the DS fundamental domain F = {x≥0, x≤½, (x−1)²+y²≥1}
// ---------------------------------------------------------------------------

/** Minimum y for a given x to stay in F. */
function minY(x) {
  // (x-1)^2 + y^2 >= 1  →  y >= sqrt(1 - (x-1)^2) = sqrt(2x - x^2)
  return Math.sqrt(Math.max(0, 2 * x - x * x));
}

const seeds = [];

// Along x = 1/2 (the Re τ = 1/2 boundary of F): y from √3/2 ≈ 0.866 upward
for (let y = 0.9; y <= 3.0; y += 0.2) {
  seeds.push({ x: 0.5, y });
}

// Interior of F: a grid
for (let x = 0.05; x < 0.5; x += 0.1) {
  const yMin = minY(x);
  for (let y = yMin + 0.1; y <= 3.0; y += 0.2) {
    seeds.push({ x, y });
  }
}

// Near the x = 0 edge (Re τ → 0): DS is degenerate here, but
// non-symmetric perturbations may yield interesting semi-solutions.
for (let y = 1.0; y <= 3.0; y += 0.25) {
  seeds.push({ x: 0.01, y });
  seeds.push({ x: 0.02, y });
}

// ---------------------------------------------------------------------------
// Perturbations: break ρ-symmetry by shifting P0 and/or P7 independently
// ---------------------------------------------------------------------------

const eps = 0.1;
const perturbations = [
  // Zero: symmetric DS baseline — validates the solver (should converge in ~0 steps)
  { dP0: [0, 0, 0],    dP7: [0, 0, 0] },

  // Shift P0 only
  { dP0: [eps, 0, 0],  dP7: [0, 0, 0] },
  { dP0: [0, eps, 0],  dP7: [0, 0, 0] },
  { dP0: [0, 0, eps],  dP7: [0, 0, 0] },

  // Shift P7 only
  { dP0: [0, 0, 0],    dP7: [eps, 0, 0] },
  { dP0: [0, 0, 0],    dP7: [0, eps, 0] },
  { dP0: [0, 0, 0],    dP7: [0, 0, eps] },

  // Shift both in the same direction
  { dP0: [eps, 0, 0],  dP7: [eps, 0, 0] },
  { dP0: [0, eps, 0],  dP7: [0, eps, 0] },

  // Shift both in opposite xy-directions (breaks ρ more strongly)
  { dP0: [eps, 0, 0],  dP7: [-eps, 0, 0] },
  { dP0: [0, eps, 0],  dP7: [0, -eps, 0] },

  // Mixed: lift one tent pole, lower the other
  { dP0: [0, 0, eps],  dP7: [0, 0, -eps * 0.5] },
  { dP0: [eps, eps, 0],dP7: [-eps, eps, 0] },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

process.stderr.write(
  `Scanning ${seeds.length} seeds × ${perturbations.length} perturbations = ` +
  `${seeds.length * perturbations.length} runs...\n`,
);

const results = scanSemiSolutions(torus, { seeds, perturbations });

const nConverged = results.filter(r => r.converged).length;
const nEmbedded  = results.filter(r => r.embedded).length;
process.stderr.write(
  `Done: ${results.length} runs, ${nConverged} converged, ${nEmbedded} embedded\n`,
);

// ---------------------------------------------------------------------------
// CSV output
// ---------------------------------------------------------------------------

process.stdout.write(
  'x_start,y_start,perturb_index,re_tau,im_tau,re_tau_red,im_tau_red,' +
  'converged,embedded,cone_residual,collinear_residual\n',
);

for (const r of results) {
  if (!r.converged) {
    process.stdout.write(
      `${r.x_start},${r.y_start},${r.perturbIndex},` +
      `,,,,` +
      `false,false,${r.coneResidual},${r.collinearResidual}\n`,
    );
    continue;
  }

  const [re, im] = r.tau;
  const [reRed, imRed] = reduceModulus([re, im]);
  process.stdout.write(
    `${r.x_start},${r.y_start},${r.perturbIndex},` +
    `${re},${im},${reRed},${imRed},` +
    `true,${r.embedded},${r.coneResidual},${r.collinearResidual}\n`,
  );
}
