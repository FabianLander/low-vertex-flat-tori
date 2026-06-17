# regions/ — the open conditions

Conditions you **gate / flow into / barrier to stay inside** — open, possibly
non-smooth. A `Region` (contract in `solvers/types.ts`) bundles the things that
genuinely *aren't* differentiable maps: a predicate gate, a signed margin
(diagnostic), and the two energies it hands out. The energies themselves are scalar
`Fn`s from `functions/` — the region only *dispenses* them; it doesn't define them.

- `embedded.ts` — the embedded region: gate = `isEmbedded` (the topological truth,
  not `margin > 0`), margin = `functions/minMargin`, enter/stay = the cell-margin /
  barrier `ScalarFn`s.

To come during the refactor: relocate `isEmbedded` (clean already, in `math/embedded.ts`)
into this layer, and `nondegenerate`.
