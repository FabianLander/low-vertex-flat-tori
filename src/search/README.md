# search/ — composing a search and running it

The top layer: assemble a `Problem` (a chart, the submanifolds to hold, the regions to
stay inside, a driver), run it, and certify the results. Depends on everything below;
nothing depends on it.

- `certify.ts` — turn a config into a `Certificate` (cone deficit, embedded, margin,
  raw τ AND reduced τ̂, area, rotDefect). Every search ends here.

To come: `problem` (compose chart + held + region + driver) and the drivers
(`walk`, `collect`) — the application layer that expresses real searches and
eventually retires the old scripts. The core operations (`project`/`flow`/`march`)
live in `solvers/`; the conditions in `submanifolds/`/`regions/`; charts in
`configuration/`.
