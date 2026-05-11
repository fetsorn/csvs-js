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

            let has_leaves = q.leaves.len() > 0;

            if has_leaves {
                let stream = dataset.clone().query_record_stream(q);

                pin_mut!(stream);

                while let Some(entry) = stream.next().await {
                    let entry = entry?;

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
                let stream = dataset.clone().select_option_stream(q);

                pin_mut!(stream);

                while let Some(entry) = stream.next().await {
                    let entry = entry?;

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

pub async fn select_record(dataset: Dataset, query: Vec<Entry>) -> Result<Vec<Entry>> {
    let mut entries = vec![];

    let s = dataset.select_record_stream(query, false);

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
