# Query algorithm resembles sort-merge join

- Status: accepted
- Date: 2026-03-20

## Context

The csvs query operation reconstructs records from sorted tablet files (one per schema edge). The current implementation uses a state machine with `StreamMap`, counters, and accumulated state (`entry`, `is_match`, `fst`, `match_map`). The code is difficult to read and verify for correctness. Before investing in refactoring, we needed to determine whether the algorithm itself is on the right track or should be replaced entirely.

## Analysis

The query problem appears to map to a **multi-way join across sorted files organized by a tree-shaped schema**. The closest known algorithm is **sort-merge join**: a single coordinated pass through each sorted file.

| Query type  | Sort-merge (current)           | With indexes        |
|-------------|--------------------------------|---------------------|
| All records | O(total data) — likely optimal | Same                |
| Single key  | O(total data)                  | O(log N) per tablet |
| Key range   | O(total data)                  | O(log N + matches)  |

Sort-merge appears optimal for full scans, which is the primary access pattern (load a dataset, browse it in evenor). Index-based lookup could improve selective queries but would require auxiliary files that conflict with the plain-text, git-friendly design constraint.

We don't have a formal model of csvs to prove optimality. This assessment is based on analogy to known database join algorithms.

## Decision

The sort-merge join approach appears sound for csvs's design constraints. The implementation should be **refactored for clarity, not replaced** — unless a formal analysis reveals a better approach.

Refactoring target: separate three concerns that are currently tangled in the state machine:

1. **Stream sorted keys from a tablet** — iterate (key, value) pairs from a sorted CSV file
2. **Join streams by key** — coordinate multiple tablet streams, grouping by matching keys
3. **Assemble entry from grains** — sow grains into entries as they arrive

## Consequences

- Algorithm is documented as an intentional choice, not accidental complexity
- Refactoring has a clear target architecture (three layers)
- Selective query optimization (indexes) is deferred as a separate future decision
- Both JS and Rust implementations should converge on the same layered structure
- A formal model of csvs operations could confirm or improve on this choice
