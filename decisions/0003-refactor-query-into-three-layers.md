# Refactor query into three layers

- Status: proposed
- Date: 2026-03-20

## Context

The query state machine implements sort-merge join across sorted tablet files (see ADR-0002). The implementation works but is difficult to read and verify. Five concerns are tangled into a single `State` struct and a single `query_line` function:

- Key grouping (`fst`, `fst_is_new`)
- Match detection (`is_match`, `match_map`, grain regex, `thing_querying`)
- Entry assembly (`entry`, `query`, `sow`)
- Output buffering (`last`)
- Tablet coordination (counter, `state_map`, `stream_map`)

The JS code contains `// NOTE: what the hell is thingQuerying?` — a sign that even the author finds the state hard to reason about.

## Decision

Separate the query into three layers with distinct responsibilities:

### Layer 1 — KeyGroupStream

Reads a sorted CSV tablet file and yields `(key, Vec<value>)` groups. Pure CSV logic, no csvs domain concepts. Replaces the `fst`/`fst_is_new` boundary detection currently in `query_line`.

Testable in isolation: give it a sorted CSV file, verify it yields the right groups.

### Layer 2 — TabletMatcher

Takes key groups from Layer 1 and applies the query predicate (grain matching, regex). Yields matched groups only. Replaces the `is_match`/`match_map`/`is_match_grains`/`is_match_querying` logic currently tangled in `query_line`.

This is where `thing_querying` gets a proper name and documentation — it's the parent key being passed down so the child tablet knows which key to join against.

### Layer 3 — EntryAssembler

Takes matched groups and `sow`s them into entries. The orchestrator nests these: when a tablet yields a matched entry, it's passed as context to the next tablet's assembler.

Replaces the `entry`/`query` mutation in `query_line` and simplifies the counter/state_map coordination in the orchestrator.

### Orchestrator

The counter-based tablet coordination in `mod.rs`/`index.js` stays (recursive async streams are hard in Rust), but becomes clearer because each layer has a single concern. The conceptual structure is:

```
for (key, values) in match(groups(root_tablet), query):
    entry = assemble(key, values)
    if more_tablets:
        for child_entry in query(child_tablets, entry):
            yield child_entry
    else:
        yield entry
```

## Execution

1. Layer 1 first — self-contained, independently testable
2. Layer 2 — filter logic extracted from query_line
3. Layer 3 — assembly and orchestrator cleanup
4. JS first (faster to iterate), then port to Rust

Each layer should pass existing tests before moving to the next. No new features, pure refactor.

## Consequences

- `State` god object breaks into per-layer structs
- `last` hack goes away — Layer 1 handles group boundaries, output is a natural yield
- `thing_querying` gets a clear name and role (parent join key)
- `query_line` disappears, replaced by composing the three layers
- Each layer is testable in isolation
- Both JS and Rust converge on the same architecture
