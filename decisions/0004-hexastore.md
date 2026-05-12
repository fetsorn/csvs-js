# Hexastore indexes

- Status: accepted
- Date: 2026-04-27

## Context

A CSVS dataset can optionally maintain hexastore indexes for query performance. In RDF terms, each CSVS record is a triple where the subject is the key, the predicate is the tablet name, and the object is the value. A hexastore provides all six orderings of these three components for efficient lookup.

### Canonical ordering

The root data tablets already provide SPO (subject-predicate-object) ordering: each tablet is one predicate, and records are sorted by key (subject). This is the canonical data and is always present.

### Index directories

Additional orderings are stored as directories at the root of the dataset, alongside data tablets. Directory names cannot collide with tablet filenames because tablet names always contain a hyphen and a `.csv` extension.

The following index directories can exist:

- `pos/` - predicate-object-subject ordering. Contains one tablet per predicate, with columns swapped (object as first column, subject as second), sorted by object. For example, `pos/name-city.csv` contains `Bath,john`.
- `sop/` - subject-object-predicate ordering. A single file mapping (subject, predicate) pairs, sorted by subject. For example, `sop.csv` contains `john,name-city`.
- `osp/` - object-subject-predicate ordering. A single file mapping (object, predicate) pairs, sorted by object. For example, `osp.csv` contains `Bath,name-city`.
- `ops/` - object-predicate-subject ordering. Equivalent to `pos/` for lookup purposes.
- `pso/` - predicate-subject-object ordering. Equivalent to canonical SPO for lookup purposes.

In practice, `pos/` is the most useful index because it enables lookup by value. `sop.csv` and `osp.csv` enable cross-predicate queries ("what do we know about entity X?") without scanning every tablet.

### On-demand materialization

Indexes are built on demand. A query engine that encounters a query pattern benefiting from a particular ordering builds the corresponding index and maintains it on subsequent writes. If an index directory or file does not exist, the engine falls back to a full scan of the canonical tablets.

An index file can be deleted at any time and will be rebuilt when next needed. Only the canonical root tablets are the source of truth.

### Maintenance

When a write occurs on a canonical data tablet, any existing index files for that predicate are updated as part of the same operation. For example, writing a record to `name-city.csv` also updates `pos/name-city.csv` if it exists, and appends to `sop.csv` and `osp.csv` if they exist. Index files that do not exist are not created on write - only on first query need.
