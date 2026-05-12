# CSVS executes SPARQL directly

- Status: accepted
- Date: 2026-04-27

## Context

CSVS currently uses SON/QON as its query and data exchange format. QON is a strict subset of SPARQL (basic graph patterns, no joins, no logic), but it is a private language invisible to the RDF/SPARQL ecosystem. Tools like yasgui, trifid, and any SPARQL client cannot talk to CSVS without a translation layer.

Existing SPARQL engines (Jena ARQ, oxigraph) require loading data into an opaque store (RocksDB, TDB) before queries can execute. This introduces an ingestion step that conflicts with CSVS's design: plain text files in git are the source of truth. The round-trip — CSVS to TTL to triplestore to SPARQL results, and back to CSVS on writes — adds complexity without adding capability.

Oxigraph has a wasm module, but wasm is a poor fit for an open standard that should have native implementations in the language of its environment.

## Decision

csvs-rs and csvs-js execute SPARQL 1.1 directly on CSVS files. No intermediate triplestore, no ingestion step, no wasm.

The architecture has three layers:

### 1. SPARQL algebra (environment-agnostic)

A SPARQL parser (spargebra in Rust, traqula in JS) produces an algebra tree. This layer plans the query: which triple patterns to evaluate, in what order, what join strategy to use. It has no knowledge of how data is stored or accessed.

### 2. Capabilities (environment-aware)

The algebra tree is executed against an abstract interface that provides data access operations: scan, seek, filter, join. Different environments provide different capabilities:

- **Unix/Tauri with large files**: `pread` binary search on sorted tablets. O(log N) seeks without loading files into memory.
- **Unix/Tauri with small files**: load into memory, hash maps.
- **IndexedDB (browser)**: load into memory. Reasonable limitation of the environment.
- **Streaming**: current sequential scan, works everywhere, slowest.

The query planner selects an execution strategy based on available capabilities. If `pread` is available and the file is sorted, use binary search. Otherwise, fall back to sequential scan. The algebra layer does not know or care which strategy is used.

### 3. File operations (storage-specific)

The leaf operations that actually read and write CSVS tablets. This is where the current streaming query code lives, and where `pread`/`pwrite` implementations would be added.

## SON mapping

SON remains the external interface for panrec and evenor. A SON query or update is mapped to SPARQL algebra internally before execution. Users of panrec and evenor do not need to know or write SPARQL. SON and SPARQL are two front doors to the same engine.

## Write path

Insert remains append-then-sort on the canonical tablets. This is comparable in cost to the oxigraph alternative (write to RocksDB + export back to TTL/CSVS), with the advantage that the CSVS files are valid at every step — at worst unsorted temporarily, but always complete.

Hexastore index files (ADR-0004), if materialized, are updated as part of the write operation.

## Benchmarking

Before investing in `pread` optimization or other execution strategies, benchmark the current append-sort write path against oxigraph-to-TTL-export on representative datasets. The hypothesis is that they are comparable, and the simpler architecture wins.

## Consequences

- CSVS becomes a SPARQL-capable triplestore without an external engine
- yasgui, trifid, and other SPARQL clients can query CSVS datasets directly
- panrec and evenor continue to speak SON, unaware of SPARQL internally
- The three-layer architecture allows adding execution strategies (pread, memory, streaming) without changing the algebra or the file format
- SPARQL 1.1 is a large spec; coverage will grow incrementally, tested against ARQ or oxigraph as reference (csvs-to-ttl-to-reference-engine as integration test oracle)
- genea and other domain UIs could eventually query CSVS via SPARQL with domain-specific schemas, replacing tightly-coupled format parsers
