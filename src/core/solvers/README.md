# solvers/ — the problem-agnostic numerical core

The methods that move a point, run **entirely on the problem's working space ℝⁿ** over **one
shared QR kernel**. They know **nothing** about a `Triangulation`, a coordinate system, or
embeddedness — only ℝⁿ, some `Fn`s, a `Region`, a `Family` — so a toy test is just "ℝⁿ + some
functions" (a sphere, a circle). `solvers/` depends on no implementation.

Three operations:

- `project.ts` — **solve onto** the submanifold ⋂{gᵢ=0}: min-norm Gauss–Newton, iterated. Every
  row of every constraint is driven (no rank hints — a rank-deficient constraint states its rank
  at the source, e.g. `flat` emits its V−1 independent rows).
- `minimize.ts` — **minimize** an energy ALONG {g=0}, staying in an open `Region` Ω: Riemannian
  gradient descent (tangent-project ∇E, step, retract via `project`), with a `Region` it becomes a
  feasibility-gated backtracking line search. (Was `flow`.)
- `continuation.ts` — **track** a 1-parameter `Family` of submanifolds ∩ Ω: corrector-continuation
  (re-`project` each parameter substep at an adaptive step, reporting the pinch where Ω closes a
  path). (Was `march`. Currently natural-parameter; a secant predictor is a TODO — see
  docs/solvers-overhaul.md.)

The kernel:

- `qr.ts` — the dense linear algebra, all from ONE economy QR of the transposed constraint
  Jacobian `Jᵀ = QR`: the **min-norm step** `s = Q R⁻ᵀ b` (`project`) and the **tangent projection**
  `v − Q Qᵀ v` (`minimize`/`continuation`). QR conditions at κ(J), not the κ(J)² of the old normal
  equations — the measured reason for the design (docs/solvers-overhaul.md). No damping; a
  rank-deficient column collapses and is carried harmlessly. Plus `infNorm`.

The contracts the operations consume — each defined where its condition lives:

- **closed** → `Constraint` = a bare `Fn` driven to zero (`constraints/types.ts`). No usage
  wrapper: there is no separate constraint *or energy* interface — a constraint IS an `Fn` driven
  to zero, an energy IS a `ScalarFn` descended (`minimize` takes one).
- **open** → `Region` ({ `contains`, optional `margin` }) — the feasible set Ω, in `embedding/`.
- **continuation** → `Family` (`param` + `held`) — the only contract `solvers/` owns, in `types.ts`.

Pure: no three.js, no DOM.
