# solvers/ overhaul — working notes & decision log

Scratch log for the in-progress rebuild of `src/core/solvers/` (and its relationship to
`sampling/` + `search/`). Captures **what we decided and the evidence behind it**, so nothing is
lost between sessions. Distill the relevant parts into the new `solvers/README.md` when the
rebuild lands, then this file can be deleted.

**Methodology (the load-bearing rule): algorithm choices are settled by measurement, never by
assertion.** A probe is a throwaway `scripts/_probe.mjs` (tsx): instrument the stepper, draw
realistic seeds from `sampling/` (perturbed-Rich, uniform-far, the DS tent family), and tally
start-residual, conditioning `κ(JJᵀ)`, convergence/divergence, iteration counts. Record the numbers.

---

## BUILD STATUS

**Structural rebuild DONE & committed** (tsc clean, 213 tests green, all 5 search scripts run):
QR kernel (`qr.ts`); `project` on QR (no damping/rank hints); `flow`→`minimize`, `march`→`continuation`
(both take a `Region`); `held.ts` deleted, `Constraint = Fn`, `flat` emits V−1; `Region` ({contains,
margin?}) in `embedding/`, `Family` in `solvers/types.ts`; `search/` + tests + scripts repointed.

**OPEN DESIGN QUESTION (revisit):** should a `Constraint` be `Fn`-driven-to-0 (current), or a
`{ fn, target }` pinning `fn → target`? Deferred, not settled — worth reconsidering (e.g. it could
make the continuation parameter literally "a constraint's target").

**TODO — the algorithm experiments (step 4, measured, not yet done):**
1. **`minimize` downhill rule.** Still the old fixed-step descent. Build the bench harness and compare
   **line-searched steepest vs nonlinear CG** (then GN-on-residual after the chord Jacobian) by
   *iterations-to-embedded* on real `discover`/`wall` descents; the winner becomes the default. Also
   wire `Region.margin` into the feasible step (margin-aware vs blind-halving). See the minimize entry below.
2. **`continuation` predictor.** A plain **tangent (Euler) predictor is REDUNDANT** with our full-`project`
   corrector — proof: the constraint residual is affine in the parameter and `J` is `s`-independent, so
   `project`'s first GN step from `x_cur` already equals `Δs·ẋ`. Do NOT build it. The real candidate is a
   **secant predictor** (extrapolate through the last two accepted points — carries curvature `project`
   doesn't see); measure whether it cuts substeps before adopting. Pseudo-arclength only if folds appear.

---

## Settled design (structure)

- **Boundary** `solvers/` ↔ `search/`: solvers = problem-agnostic numerics on `ℝⁿ` + abstract
  `Fn`/`Region`/`Family` (the "could I run it on a sphere?" test). search = the torus application
  that *instantiates* them (chooses the constraints/energy/family/chart, builds the region from
  `isEmbedded`, seeds, certifies, drives with `collect`). The current boundary is already right; the
  overhaul is *inside* solvers (algorithms + internal tiering), not a re-drawing of the line.

- **Tiers inside `solvers/`:** **kernel** (linear algebra + the reusable nonlinear primitives) →
  **contracts** → **operations** (`project` / `minimize` / `continue`).

- **Contracts** (each condition-folder owns its own contract + instances, the established
  machinery↔instances pattern):
  - `Constraint`/`Held` — stays in `constraints/types.ts` (closed conditions).
  - **`Region`** — rename of `Gate`, **moved to `embedding/`** (open condition Ω, defined where its
    instance `isEmbedded`/`clearance` lives, exactly as `Constraint` lives in `constraints/`).
    Richer shape `{ contains(x): boolean; margin?(x): number }` (margin = `clearance`), so the
    feasibility step can use distance-to-boundary instead of blind halving.
  - **`Family`** — the lone solver-owned contract (a continuation parameter's worth of constraints;
    no condition home). Move it out of `march.ts` into `solvers/types.ts`.

- **Naming:** `flow → minimize`, `march → continue` (the math verbs). `minimize` and `continue` stay
  two explicit operations sharing the `project`-retract + tangent primitives (not one pluggable
  "walk").

- **Feasibility story (coherent, replacing gate+penalty+barrier-at-once):** reach Ω = `minimize` the
  overlap **penalty**; stay in Ω = use `Region.margin` to size the step (step a safe fraction to the
  boundary), with `contains` the hard backstop; the fatten log-**barrier** is optional extra interior
  pressure, not load-bearing.

---

## DECIDED — Kernel: min-norm step + tangent projection via **QR of Jᵀ**

Replaces the current normal-equations (`JJᵀ`) + Gauss-elimination kernel.

GN move `Δx = −Jᵀ(JJᵀ)⁻¹F`. **Normal equations** (form `G=JJᵀ`, solve `Gw=F`) condition at **κ(J)²**;
**economy QR** of `Jᵀ = QR` gives `Δx = −Q(R⁻ᵀF)` at **κ(J)**, and the tangent projection collapses to
`P_T v = v − Q(Qᵀv)` — one factorization serves both primitives, no damping.

Evidence (triangulation #7, n = 400 per row):

| recipe | start max\|2π−θ\| | κ(JJᵀ) start med / max | conv / div | iters med / max |
|---|---|---|---|---|
| discover  flat near (σ=0.1)        | 0.85 | — (fast ⟹ low) | 400 / 0 | 4 / 4 |
| discover  flat far (uniform 1.0)   | 3.27 | — (fast ⟹ low) | 400 / 0 | 5 / 7 |
| semiSolution  flat+2·collinear (σ=0.05) | 0.21 | **1.1e6 / 1.1e10** | 400 / 0 | 17 / **147** |
| semiSolution  flat+2·collinear (σ=0.3)  | 1.22 | 1.6e4 / 2.2e9 | 400 / 0 | 20 / 70 |
| wall  flat+modulusWall (σ=0.02)    | 0.18 | 7.6e2 / 9.3e2 | 400 / 0 | 5 / 5 |
| wall  flat+modulusWall (σ=0.08)    | 0.70 | 6.6e2 / 1.3e3 | 376 / 0 (+24 max-iters) | 5 / 7 |

Head-to-head on the ill-conditioned `semiSolution σ=0.05` (same 400 seeds, only the linear solve
swapped):

| solve | iters med | mean | **max** |
|---|---|---|---|
| normal equations (current) | 17 | 21.6 | **147** |
| QR of Jᵀ (decided)         | 16 | 16.1 | **29** |

Reading: where conditioning is fine (discover, wall, the `semiSolution` median) the two agree. QR's
win is the **ill-conditioned tail** — `semiSolution` hits `κ(JJᵀ)=1e10` (= κ(J)² ≈ (10⁵)²), so the
normal-equations step loses ~`κ·ε` precision and crawls to 147 iters; QR caps it at 29 (mean −26%).
QR is never worse, negligible extra cost at our sizes (`K ≤ 18`), and unifies the two kernel
primitives → a **single QR path**, no normal-equations/Cholesky alternative.

## DECIDED — No Levenberg–Marquardt (adaptive damping)

**0 divergences** across every probe (near & far, κ up to 1e10). Non-convergences are only
`max-iters`: slowness, or — for `wall` — a frozen SL(2,ℤ) chart in the wrong chamber at large σ
(κ ~1e3, a **search-side** issue, fix in `search/`, not the kernel). LM robustifies divergence, which
the data shows we don't have. Revisit only if a future recipe actually diverges.

---

## DECIDED — `Constraint = Fn`; delete `held.ts`; `flat` emits V−1 rows

- `Held`/`drive`/`measure` all removed. `measure`: 0 users. `drive`: proven inert — `project`
  converges identically driving all V vs V−1 rows (400/400, median 4 iters), because the solve
  already handles `flat`'s rank-deficient-but-consistent system (Σδ ≡ 0 by Gauss–Bonnet).
- `flat`'s single redundant row is removed **at the source**: `flat(triang)` returns a (V−1)×3V map
  (drop one vertex — any one). The full V-deficit *measurement* stays in `coneAngleDeficits` /
  `maxConeDeficit` (certificate / viewer / acceptance). Measurement and constraint were always
  separate functions, so nothing is lost.
- ⟹ every stacked system (flat+collinear², flat+wall, …) is full rank by construction → **plain
  economy QR, no damping, no pivoting.** A constraint is just an `Fn`; the solver drives every row.

## PENDING — decide the same way (measured)

- **`minimize` (`flow`) — approach DECIDED, winner pending.** We will **implement a small library of
  step rules and benchmark them**, not pick one by argument. Two reasons it isn't assertable:
  - **The overlap energy is a sum of squares.** `chordLengthSquared = Σ chord²` is `‖r‖²` (NLLS), so
    **Gauss–Newton/LM on the chord residual `r`** is the structurally-best candidate for the
    *reach-embeddedness* phase — not generic descent. The fatten energies (`cellMargin` hinge,
    `cellBarrier` −log) are **not** SoS → first-order/quasi-Newton there. So **the best optimizer
    likely differs by phase**, which is itself an argument for a small library.
  - Each optimizer is just a **step rule** over the shared QR kernel (tangent-project + retract +
    gate), so candidates are cheap to add.
  - **Downhill methods to implement (LOCKED):**
    1. **steepest descent + line search** — the control (current `flow` is steepest with a *fixed*
       step; this adds a real step-length search).
    2. **nonlinear conjugate gradient** — cheap on top of #1, the main general contender.
    3. **Gauss–Newton on the chord residual** — structural favorite (overlap energy = sum of
       squares); **gated on the chord Jacobian** (analytic-gradient work), so it lands after #1/#2.
    - **L-BFGS: deferred** — most code + needs manifold vector transport; build only if CG
      underperforms. Don't build on spec.
    - Build #1 + #2 first (both run on the existing FD gradient), benchmark iterations-to-embedded;
      the benchmark also reveals whether the energy's active-set kinks trip up CG (if so, the robust
      line-searched steepest wins). Fold in #3 once the residual Jacobian exists.
  - **Benchmark metric:** *iterations* to a target embedding margin + robustness (blocked/stalled
    rate) + final margin, on real `discover`/`wall` descents. Iteration count is
    **gradient-cost-agnostic** — the verdict holds whether gradients are FD or analytic.
  - **Two independent axes, do not conflate:** (1) which optimizer (← benchmark by iterations);
    (2) **analytic energy gradients** — derivable (the energies are piecewise-smooth, differentiable
    within an active set, exactly like the τ-Jacobian; FD is *not* permanent), a separate
    per-iteration speedup for whichever optimizer wins. GN-on-residual *requires* the chord
    Jacobian, so it's contingent on (part of) that analytic work; the other three run on the
    existing gradient now.
  - **Feasibility step** (margin-aware vs. blind-halving) is a *shared, separately-toggled*
    component inside each candidate's line search — not baked per-optimizer.
- **`continuation` (`march`) — predictor TODO (see BUILD STATUS).** Currently natural-parameter
  (corrector-only), and it works. The tangent/Euler predictor we'd planned is **redundant** with the
  full-`project` corrector (project's first GN step already takes the tangent step). The real candidate
  is a **secant predictor** — measure whether it cuts substeps before adopting; else leave as-is.
- **`wall` 6% max-iters** (search-side): the frozen chart lands in the wrong SL(2,ℤ) chamber at
  large σ. Handle in `search/` (re-freeze / re-check chamber), not in solvers.
