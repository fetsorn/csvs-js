---
status: active
---

# 001 Prose store implementation

Implement the prose store described in ADR-0007 (commat operator) for
both JS and RS.

## Address abstraction

A trait/interface that maps a CSVS value + optional language tag to a
filesystem path under `prose/`. Two backends:

- **URI-encoded**: `prose/{encodeURIComponent(value)}[.lang]` — default,
  human-readable
- **SHA256 hash**: `prose/{sha256(value)}[.lang]` — fallback for long
  values

### RS

New module `rs/src/dataset/prose/`:

```
prose/
  mod.rs        — ProseAddress trait + read/write helpers
  uri.rs        — URI-encoded strategy
  hash.rs       — SHA256 strategy
```

```rust
pub enum ProseAddress {
    Uri,
    Hash,
}

impl ProseAddress {
    fn path(&self, dir: &Path, value: &str, lang: Option<&str>) -> PathBuf;
}
```

Dataset gets a field `prose_address: ProseAddress`, default `Uri`.

### JS

New module `js/src/prose/`:

```
prose/
  index.js      — read/write helpers, address dispatch
  uri.js        — URI-encoded strategy
  hash.js       — SHA256 strategy
```

Functions take `fs` like everything else.

## Recognizing `@` keys

Keys starting with `@` are prose keys, not schema branches.

- `@` — untagged prose
- `@en`, `@ru`, etc. — language-tagged prose (BCP 47)

### RS

Add to Entry:

```rust
pub prose: HashMap<Option<String>, String>
```

Key is `None` for untagged, `Some("en")` for tagged. Populated only
when prose flag is set. Serialization emits `@`, `@en`, etc.

### JS

Records are plain objects. Keys starting with `@` are filtered out
before tablet operations and handled separately by prose helpers.

## Write path (insert + update)

On insert or update:

1. Strip `@` keys from the record
2. Write each `@` key's value to `prose/` via the address abstraction
   (create on insert, overwrite on update — same codepath)
3. Pass the stripped record to existing tablet insert/update

## Read path (build_record)

build_record gets a new `prose` flag, default false.

When `prose: true`:

1. Assemble record from tablets as usual
2. After assembly, resolve prose blobs for the base value
3. Attach as `@`, `@en`, etc. on the returned record

select never collects prose. The `light` flag is orthogonal — it
controls tablet depth, not prose.

## Search path (query with `@`)

When a query record has a non-empty `@` value (regex):

1. Grep the `prose/` directory for files whose content matches
2. Decode filenames back to values via the address abstraction
3. Intersect with tablet query results

When `@` is empty string in a query, it means "return prose" — same
as setting the prose flag in build_record.

## No delete

Blobs are never deleted by csvs. The same value can appear in multiple
branches. Orphaned blobs from renamed values are the user's
responsibility.

## Implementation order

1. [ ] Address abstraction (URI + hash backends) — RS and JS
2. [ ] Write path (insert/update strip `@`, write blobs)
3. [ ] Read path (build_record with prose flag)
4. [ ] Search path (query with `@` regex)
5. [ ] Test cases in `test/`
