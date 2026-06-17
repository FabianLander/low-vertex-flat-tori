# docs/math — the system, mathematically

How the code maps onto the mathematics. Each document describes one layer of the system first
**mathematically**, then **how it is computed and stored in code**. The top-level
[`README.md`](../../README.md) is the overview; this folder is the depth.

The objects, each built on the previous:

| layer | document | what it is |
| --- | --- | --- |
| topology | — | the torus (genus 1). Not an object — the fact `V − E + F = 0`. |
| discrete topology | [triangulation.md](triangulation.md) | a combinatorial triangulation realizing the torus. Pure combinatorics. |
| decoration | [marking.md](marking.md) | a fundamental domain + an `H₁` basis: how to unroll, and the τ-generators. Includes the minimum-cut, unroll-order, and homology-generator algorithms. |
| measurement | *planned: `developing.md`* | the developing map: unfold → holonomy → τ ∈ ℍ (Teichmüller), and the `SL(2,ℤ)` quotient to moduli. |

Convention in each doc: a **The mathematics** section, an **In code** table (symbol → file →
role), and — where there is a real algorithm — **how it's computed** and **how it's stored**.
