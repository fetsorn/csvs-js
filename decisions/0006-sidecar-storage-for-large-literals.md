# 6. Sidecar storage for large literals

Date: 2026-05-09

## Status

Superseded by ADR-0007

## Context

Some RDF literals (e.g. issue descriptions, prose content) are too large
for CSV cells. Storing multi-paragraph text in a CSV row slows down
queries because every query on that branch loads and parses the large
cells even when the query doesn't need the text content.

We considered storing large values as sidecar files in folders
(`csvs/trunk-leaf/trunk1.md`) instead of CSV rows, with csvs managing
the conversion via optimize/compact operations.

## Decision

Csvs does not optimize large literal storage. Large values stay in CSV
cells. The sidecar folder approach breaks the SPARQL contract:

- **One-to-many**: one trunk with multiple leaf values requires an
  arbitrary file naming scheme (e.g. `trunk.1.md`, `trunk.2.md`),
  which is fragile and leaks storage concerns into SPARQL updates.
- **Many-to-many**: shared leaf values require duplicate files.
- **SPARQL updates**: inserting a second value for a trunk would have
  to fail until `csvs compact` is run, tying SPARQL operations to
  storage format decisions.

If a consumer wants faster queries over large text, they store
references (e.g. uuids, filenames) in csvs and manage the large files
separately. This is what evenor does for lfs media — csvs stores the
hash, evenor resolves it to a URL at presentation time. The same
pattern applies to prose: csvs stores a reference, evenor reads/writes
the actual content on describe/update.

## Consequences

- Csvs stays simple — CSV cells only, full SPARQL contract preserved
- Large text in CSV is slow but correct
- Performance optimization for large literals is the consumer's
  responsibility (evenor, not csvs)
- Same pattern as lfs: csvs stores references, evenor resolves them
