use crate::{Result, Dataset, Entry};
use async_stream::try_stream;
use futures_core::stream::Stream;
use futures_util::pin_mut;
use futures_util::stream::StreamExt;
use std::collections::HashSet;

pub fn select_record_stream(
    dataset: Dataset,
    query: Vec<Entry>,
    light: bool,
) -> impl Stream<Item = Result<Entry>> {
    try_stream! {
        let mut seen = if query.len() > 1 {
            Some(HashSet::new())
        } else {
            None
        };

        for q in query {
            let is_schema = q.base == "_";

            if is_schema {
                let schema_record = dataset.select_schema().await?;

                yield schema_record;

                continue;
            }

            let is_version = q.base == ".";

            if is_version {
                let version_record = dataset.select_version().await?;

                yield version_record;

                continue;
            }

            // Extract prose filters from query
            let prose_filters: Vec<(Option<String>, String)> = q.prose.iter()
                .filter(|(_, v)| !v.is_empty())
                .map(|(lang, pattern)| (lang.clone(), pattern.clone()))
                .collect();

            let prose_allowed: Option<HashSet<String>> = if !prose_filters.is_empty() {
                let mut allowed: Option<HashSet<String>> = None;

                for (lang, pattern) in &prose_filters {
                    let matches = dataset.prose_address.search_prose(
                        &dataset.dir,
                        pattern,
                        lang.as_deref(),
                    )?;

                    let match_set: HashSet<String> = matches.into_iter().collect();

                    allowed = Some(match &allowed {
                        None => match_set,
                        Some(prev) => prev.intersection(&match_set).cloned().collect(),
                    });
                }

                allowed
            } else {
                None
            };

            // Strip prose keys from query before tablet dispatch
            let mut q_stripped = q.clone();
            q_stripped.prose.clear();

            let has_leaves = q_stripped.leaves.len() > 0;

            if has_leaves {
                let stream = dataset.clone().query_record_stream(q_stripped);

                pin_mut!(stream);

                while let Some(entry) = stream.next().await {
                    let entry = entry?;

                    // Filter by prose matches
                    if let Some(ref allowed) = prose_allowed {
                        if let Some(ref bv) = entry.base_value {
                            if !allowed.contains(bv) {
                                continue;
                            }
                        }
                    }

                    if let Some(ref mut set) = seen {
                        if let Some(ref bv) = entry.base_value {
                            if !set.insert(bv.clone()) {
                                continue;
                            }
                        }
                    }

                    if light {
                        yield entry;

                        continue;
                    }

                    let entry = dataset.clone().build_record(entry).await?;

                    yield entry;
                }
            } else {
                let stream = dataset.clone().select_option_stream(q_stripped);

                pin_mut!(stream);

                while let Some(entry) = stream.next().await {
                    let entry = entry?;

                    // Filter by prose matches
                    if let Some(ref allowed) = prose_allowed {
                        if let Some(ref bv) = entry.base_value {
                            if !allowed.contains(bv) {
                                continue;
                            }
                        }
                    }

                    if let Some(ref mut set) = seen {
                        if let Some(ref bv) = entry.base_value {
                            if !set.insert(bv.clone()) {
                                continue;
                            }
                        }
                    }

                    if light {
                        yield entry;

                        continue;
                    }

                    let entry = dataset.clone().build_record(entry).await?;

                    yield entry;
                }
            }
        }
    }
}

pub async fn select_record(dataset: Dataset, query: Vec<Entry>, light: bool) -> Result<Vec<Entry>> {
    let mut entries = vec![];

    let s = dataset.select_record_stream(query, light);

    pin_mut!(s);

    while let Some(entry) = s.next().await {
        let entry = entry?;

        entries.push(entry);
    }

    Ok(entries)
}

pub async fn print_record(dataset: Dataset, query: Vec<Entry>) -> Result<()> {
    let s = dataset.select_record_stream(query, false);

    pin_mut!(s);

    while let Some(entry) = s.next().await {
        let entry = entry?;

        println!("{}", entry);
    }

    Ok(())
}
