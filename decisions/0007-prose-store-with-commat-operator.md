# 7. Prose store with commat operator

- Status: proposed
- Date: 2026-05-12

## Context

CSVS values must be small for fast parsing and hexastore indexing. But
any value in the graph may need a large text description attached to it
-- a prose explanation, a long comment, a body of content. ADR-0006
rejected sidecar storage because it broke the SPARQL contract with
one-to-many naming and storage-coupled updates.

The problem remains: there is no way to associate large text with a
value without putting it in a CSV cell.

Earlier CSVS datasets used a convention called "datum" -- a schema
branch (e.g. `event-datum.csv`) that held long text values as regular
CSV fields. This worked but had no special semantics: datum was just
another predicate, its values were indexed in the hexastore like any
other, nothing prevented them from being used as subjects, and
querying event keys required parsing through large datum cells in the
same tablet, slowing down every search. Similarly, evenor datasets
used language-specific branches (e.g. `branch-description_en.csv`,
`branch-description_ru.csv`) as a consumer convention for localized
text. The commat operator evolves both patterns into a first-class
feature with proper constraints and language tag support.

In RDF, literals are terminal (can only be objects, never subjects).
CSVS values are arbitrary unicode strings that can appear in either
column. Rather than imposing the IRI/literal split, we introduce a
parallel prose store accessible through a reserved SON operator. The
`@` sigil is chosen because it is the language tag delimiter in RDF
(`"text"@en`), making the mapping natural.

## Decision

Every CSVS value can optionally have large text descriptions, stored
in a content-addressed prose store outside the CSV tablets. The blob
store is a parallel layer -- it does not add predicates to `_-_.csv`
or triples to the hexastore.

### Storage

Descriptions are stored in a prose store addressed by CSV values --
given a value, the addressing scheme resolves it to a blob and back.
Each value can have at most one untagged description and one
description per language tag (BCP 47 suffixes).

The choice of addressing scheme is an implementation concern. Two
natural strategies:

- **URI-encoded filenames**: `prose/visited-japan.en` -- human-readable,
  a lay person can browse the store directory. Limited by filesystem
  filename length (~255 bytes).
- **Content hash**: `prose/{sha256(value)}.en` -- no length limit,
  but opaque without an index.

Implementations expose this as an address abstraction with multiple
backends.

### SON operator

The at-sign character `@` is a reserved field key prefix in SON
records.

**Write** -- a data record with `@` stores the blob:

```
{ "_": "event", "event": "visited-japan", "@": "We visited Tokyo and Kyoto in spring..." }
{ "_": "event", "event": "visited-japan", "@en": "We visited Tokyo", "@ru": "Мы посетили Токио" }
```

**Query** -- a query record with `@` retrieves the blob. The value is
a regex filter on blob content, consistent with other SON query fields:

```
{ "_": "event", "event": "visited-japan", "@": "" }
{ "_": "event", "event": "visited-japan", "@en": "" }
```

Returns the record with `@` (or `@en`, etc.) populated with the blob
text (or omitted if no blob exists).

**Nested** -- to access the description of a specific field value
rather than the base value, expand the field to a SON record:

```
{ "_": "event", "date": { "_": "date", "date": "2024", "@": "" } }
```

**Search** -- `@` with a non-empty string in a query filters by blob
content:

```
{ "_": "event", "@": "Tokyo" }
{ "_": "event", "@ru": "Токио" }
```

Returns records whose base value has a description matching the regex.

### Example

An event has a date, and both have descriptions in two languages:

RDF:

```turtle
ex:visited-japan  a            ex:Event ;
                  ex:date      ex:2001-01-01 ;
                  rdfs:comment "We visited Tokyo and Kyoto in spring"@en ;
                  rdfs:comment "Мы посетили Токио и Киото весной"@ru .

ex:2001-01-01     rdfs:comment "Cherry blossom season"@en ;
                  rdfs:comment "Сезон цветения сакуры"@ru .
```

SON:

```
{ "_": "event", "event": "visited-japan",
  "@en": "We visited Tokyo and Kyoto in spring",
  "@ru": "Мы посетили Токио и Киото весной",
  "date": { "_": "date", "date": "2001-01-01",
    "@en": "Cherry blossom season",
    "@ru": "Сезон цветения сакуры" } }
```

### SPARQL mapping

At the SPARQL boundary, `@` maps to `rdfs:comment` with language tags.
A query like:

```sparql
SELECT ?event WHERE {
  ?event a :event ;
         rdfs:comment ?desc .
  FILTER(lang(?desc) = "en" && contains(?desc, "Tokyo"))
}
```

resolves `rdfs:comment` triples from the prose store, not from CSV
tablets.

## Consequences

- CSV tablets stay unchanged -- small values only, hexastore unaffected
- Supersedes ADR-0006: blobs are not sidecar files per predicate but a
  global store with URI-encoded filenames for human readability
- `@` is added to the set of reserved SON field key prefixes alongside
  `_`
- Any value can have at most one untagged description and one per
  language tag
- Blob content is never indexed in the hexastore, only searched via
  grep at query time
- The prose store is optional -- a CSVS dataset without blobs works
  exactly as before
- Replaces the datum branch convention and evenor's language-specific
  description tablets with a unified mechanism
