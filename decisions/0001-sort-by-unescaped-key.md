# Sort tablet files by unescaped key

- Status: accepted
- Date: 2026-03-20

## Context

Tablet CSV files are sorted after insert and update so that `update_line` can do ordered merge-insertion. `update_line` compares keys after unescaping (`\n` → real newline, byte 10). But `sortFile` (JS) used raw `Array.sort()` and `sort_file` (Rust) used the `text-file-sort` crate — both sorting by raw CSV text. In raw text, `\` is byte 92, so `value\n1` sorted *after* `value2`. After unescaping, newline is byte 10, so it should sort *before*. The mismatch meant `update_line` would misidentify insertion points when keys contained escaped newlines or quotes.

## Decision

Sort tablet files by parsing each CSV line, extracting the first field, unescaping it, then comparing by byte order. Both JS and Rust use lexicographic byte-order comparison (`<`/`>` in JS, `String::cmp` in Rust), so a dataset written by one implementation sorts identically when read or updated by the other.

JS previously used `localeCompare` (ICU collation), which reorders accented characters, mixed case, and non-ASCII strings differently than byte order. This was changed to byte-order operators to match Rust and guarantee cross-implementation sort stability.

## Consequences

- Fixes data corruption on insert/update when keys contain newlines or quotes
- Removes `text-file-sort` dependency from csvs-rs
- Test fixtures in csvs-test updated to reflect correct order
- Both implementations now produce identical CSV file ordering for all Unicode keys
- Byte order is locale-independent: sorting does not change based on system locale or platform
- Trade-off: byte order is not linguistically "correct" (e.g. `Z` sorts before `a`, `é` sorts after `z`). This is acceptable because tablet sort order is an internal invariant for merge-insertion, not a user-facing display order
