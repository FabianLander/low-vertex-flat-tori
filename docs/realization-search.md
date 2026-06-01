# Finding flat embedded 8-vertex tori via the realization reformulation

Fixed abstract triangulation $K$ of $T^2$: $V$ ($|V|=8$), $E$ ($|E|=24$), $F$ ($|F|=16$),
$\chi=0$; every vertex has degree 6.

## 1. Two descriptions of a flat structure, with dimensions

### 1a. Metric (edge-length) description
A Euclidean cone metric subordinate to $K$ is $\ell\in\mathbb R_{>0}^E$ with every face obeying the
strict triangle inequalities. Cone angle $\theta_v(\ell)=\sum_{f\ni v}\alpha_{f,v}(\ell)$, with
$\alpha_{f,v}$ from the law of cosines. The metric is **flat** iff $\theta_v=2\pi$ for all $v$ — 8
equations.

Discrete Gauss–Bonnet: every Euclidean face has angle sum $\pi$, so
$\sum_v\theta_v=\pi|F|=16\pi=2\pi\cdot 8$, hence $\sum_v(\theta_v-2\pi)\equiv 0$ **identically**.
The 8 functions $g_v=\theta_v-2\pi$ thus satisfy one linear relation $\sum_v g_v\equiv0$; generically
the rank of $\{dg_v\}$ is $7$.

> **Flat locus $\mathcal F_\ell=\{g_v=0\}\subset\mathbb R_{>0}^{24}$ has codimension 7, dimension 17.**

(This corrects the "16-dim" in `newton.ts`, which used $24-8$ and missed the Gauss–Bonnet
dependency.)

### 1b. Realization in $\mathbb R^3$
Chord map $c:(\mathbb R^3)^V\to\mathbb R^E$, $c(P)_{ij}=\lVert P_i-P_j\rVert$. Domain dim $24$;
generic fibers are $\mathrm{Isom}^+(\mathbb R^3)$ (dim 6), so $\mathcal R:=\operatorname{im}c$ has
dim $18$, codim $6$. Hence:

- realizable flat metrics $\mathcal F_\ell\cap\mathcal R$: generic dim $17+18-24=\mathbf{11}$;
- the 3D flat locus $\mathcal F_{3D}=c^{-1}(\mathcal F_\ell)$: dim $11+6=\mathbf{17}$;
- modulo similarity (rigid 6 + scale 1): $17-7=\mathbf{10}$-dim space of flat-torus *shapes*, which
  fibers over Teichmüller $\tau\in\mathbb H$ (2-dim) with 8-dim fibers.

The **embedded** ones form an open subset of $\mathcal F_{3D}$; "moduli space of embedded flat
8-vertex tori" is its image in $\mathbb H$, a (≤2-dim) region — the object the viewer plots.

## 2. The geometric chart: flatness becomes an open condition

### 2a. The chart
Fixed combinatorial *developing data*: a spanning tree of $K^{(1)}$ and, per edge $e=(i,j)$, an
integer winding $(m_e,n_e)\in\mathbb Z^2$ (the deck translation of $e$'s geodesic representative).
We already have these as lattice offsets in the developing module.

Variables: lattice $\Lambda=\langle b_1,b_2\rangle$, $b_k\in\mathbb R^2$; vertex lifts
$\tilde\phi:V\to\mathbb R^2$. Define
$$\ell_e(b,\tilde\phi)=\big\lVert\,\tilde\phi(i)-\tilde\phi(j)-m_e\,b_1-n_e\,b_2\,\big\rVert,
\qquad e=(i,j).$$
Gauge-fix $\tilde\phi(0)=0$ and $b_1\in\mathbb R_{>0}\times\{0\}$. Free parameters: $s=|b_1|$ (1),
$b_2$ (2), $\tilde\phi(v)$ for $v\ne 0$ (14) — total **17** $=\dim\mathcal F_\ell$. Modulus
$\tau=b_2/b_1\in\mathbb H$, scale $s$.

### 2b. Flatness proposition
Let $\Phi:T^2\to E_\Lambda=\mathbb R^2/\Lambda$ be affine on each face (vertices $\mapsto[\tilde\phi(v)]$,
edges $\mapsto$ geodesics). Let $\mathcal U=\{(b,\tilde\phi):\Phi\text{ is a homeomorphism}\}$.

> **Proposition.** On $\mathcal U$, $\theta_v\equiv 2\pi$ for all $v$ (so $\ell(\mathcal U)\subset
> \mathcal F_\ell$). $\mathcal U$ is open, and $\ell|_{\mathcal U}$ is a local diffeomorphism onto an
> open subset of $\mathcal F_\ell$.
>
> *Proof.* A homeomorphism $\Phi$ that is affine on faces with matching edge lengths is a piecewise
> isometry from the glued cone metric to the smooth flat torus $E_\Lambda$ (affine maps between
> Euclidean triangles with equal edge lengths are isometries, agreeing on shared edges). $E_\Lambda$
> is smooth flat, so every point — in particular each $\phi(v)$ — has total angle $2\pi$; pulling
> back, $\theta_v=2\pi$. Nondegeneracy and local injectivity are open; the dimensions match
> ($17=17$) and $d\ell$ is generically full rank. ∎

### 2c. Practical membership and guard (where the subtlety lives)
$\Phi$ is a homeomorphism iff (i) every face is nondegenerate and positively oriented and (ii)
$\Phi$ has degree 1 with no branch points. At a vertex $v$ the link maps to a closed polygon of
winding number $w_v\in\mathbb Z$ about $\phi(v)$, and $\theta_v=2\pi w_v$.

**Positive orientation of all faces does *not* imply $w_v=1$.** One can have all six star-faces of
$v$ positively oriented yet $w_v=2$: the six CCW corner-angles, each in $(0,\pi)$, summing to
$4\pi$ — a genuine $4\pi$ cone point. So "all faces positive" is necessary, not sufficient.

But $w_v$ is integer-valued and **locally constant** on $\{$all faces nondegenerate$\}$: it can
change only when a star-face degenerates. Therefore:

> Start at a configuration verified to have $w_v=1\ \forall v$ (e.g. the development of a known
> seed), and keep all 16 faces strictly positively oriented. Then $w_v\equiv 1$, i.e. we stay in
> $\mathcal U$ and the metric stays **exactly** flat.

Monitoring the 16 signed areas is the cheap continuous guard; $w\equiv1$ membership is verified
once at the start. **On $\mathcal U$, flatness is an open condition — no equations to solve.**

## 3. Reformulated search
$$\textbf{Find } (b,\tilde\phi)\in\mathcal U,\; P\in(\mathbb R^3)^V \text{ s.t. }
\lVert P_i-P_j\rVert=\ell_e(b,\tilde\phi)\ \forall e\quad(\text{realization}),\quad
P\ \text{embedded (open)}.$$
At a solution $P$'s induced metric equals the flat metric $\ell$, so $\theta_v(c(P))=2\pi$
automatically — $P$ is intrinsically flat and embedded. **No angle equation is ever solved;
flatness comes from $\mathcal U$.**

**Honest bookkeeping.** We have *eliminated* the codim-7 flatness equality (now the open condition
$\mathcal U$) and *isolated* the genuine remaining obstruction as the realization
$\ell\in\mathcal R$ (codim 6) — i.e. "which flat metrics embed isometrically as straight-edge
8-vertex polyhedra," the hard universality-type content. Difficulty is conserved, not removed: the
codim-6 realizability + open embeddedness is the true wall, now posed as a **least-squares
realization** rather than a transcendental angle solve, **with $\tau$ as an explicit coordinate.**

## 4. Algorithm
$$\min_{(b,\tilde\phi)\in\mathcal U,\;P}\ \sigma(P,\ell):=\sum_{e\in E}\big(\lVert P_i-P_j\rVert-\ell_e(b,\tilde\phi)\big)^2
\;+\;\mu\!\!\sum_{\text{non-adjacent cells}}\!\!\beta\big(\mathrm{dist}\big),$$
$\beta$ a one-sided collision barrier (reuse `cellMargin`). $\mathcal U$ enforced as a hard guard:
backtrack any step that makes a face's signed area $\le 0$.

Variables: $\tau$ (fixed when targeting), $s$, $\{\tilde\phi(v)\}_{v\ne0}$, $\{P_v\}$.

Solver: alternate (a) Levenberg–Marquardt / Gauss–Newton on the stress residuals
$r_e=\lVert P_i-P_j\rVert-\ell_e$ jointly in $(P,\tilde\phi,b)$, and (b) stress-majorization
(SMACOF) steps on $P$ alone for robustness; re-project into $\mathcal U$ after each step.

Init: metric $\tilde\phi=$ regular lattice (a known $\mathcal U$ point), $\tau=\tau_0$; $P$ a torus
of revolution with $\phi(v)$ as angular coordinates, fat enough to start embedded.

Accept: $\sigma<\epsilon$, all faces positive (then verify $\max_v|\theta_v-2\pi|$ a posteriori),
and `isEmbedded(P)`.

Moduli coverage / targeting: fix $\tau_0$, optimize the rest; sweep $\tau_0$ over a grid in
$\mathbb H$. Reachable cells = the realizable+embedded region; unreachable cells = its boundary
(the universality limit). This is the principled "how wide can we get," with $\tau$ as input.

## 5. Validation protocol (before any search)
1. Take a known embedded flat seed $P^\star$, compute its development $(b^\star,\tilde\phi^\star)$;
   verify $w_v=1$ (so $\in\mathcal U$) and $\ell(b^\star,\tilde\phi^\star)=c(P^\star)$. — chart is correct.
2. Perturb $P$ off $P^\star$, fix the seed's metric, run the realization solver; confirm it returns
   to an embedded flat torus ($\sigma\to0$, embedded). — solver works; flat-embedded is a $\sigma=0$ attractor.
3. Free the metric; move $\tau$ slightly and re-realize. — moduli motion works in-chart.

## 6. Risks / open questions (stated, not hidden)
- **Extent of $\mathcal U$ over $\mathbb H$.** Does $K$ admit geodesic realizations for the $\tau$ we
  want? $\mathcal U\ne\emptyset$ (it contains the seed developments), but its $\tau$-image may be
  limited; if a target $\tau$ is outside it, *no* flat metric of this combinatorial type exists
  there — a real, detectable obstruction independent of embedding.
- **Realizability (codim 6).** Generic in-chart metrics are not $\mathbb R^3$-realizable; the solver
  seeks the realizable locus. Stress can have local minima; SMACOF + warm starts mitigate but do
  not guarantee globality.
- **Embeddedness** remains global/nonconvex; the barrier controls margin, not topology changes.
- This does **not** dodge the universality wall — it conserves that difficulty and recasts it as a
  robust realization with moduli control, replacing the brittle transcendental angle-Newton that
  has no $\tau$ handle.
