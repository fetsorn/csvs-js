use crate::{Error, Result, Dataset, Entry, Schema};
use async_stream::{stream, try_stream};
use futures_core::stream::{BoxStream, Stream};
use futures_util::pin_mut;
use futures_util::stream::StreamExt;
use std::pin::{Pin, pin};

pub fn select_record_stream<S: Stream<Item = Result<Entry>>>(
    dataset: Dataset,
    input: S,
) -> impl Stream<Item = Result<Entry>> {
    try_stream! {
        for await query in input {
            let query = query?;

            let has_leaves = query.leaves.len() > 0;

            if has_leaves {
                let stream = dataset.clone().query_record_stream(query);

                pin_mut!(stream); // needed for iteration

                while let Some(entry) = stream.next().await {
                    let entry = entry?;

                    let entry = dataset.clone().build_record(entry).await?;

                    yield entry;
                }
            } else {
                let stream = dataset.clone().select_option_stream(query);

                pin_mut!(stream); // needed for iteration

                while let Some(entry) = stream.next().await {
                    let entry = entry?;

                    let entry = dataset.clone().build_record(entry).await?;

                    yield entry;
                }
            }
        }
    }
}

pub async fn select_record(dataset: Dataset, query: Vec<Entry>) -> Result<Vec<Entry>> {
    let readable_stream = try_stream! {
        for q in query {
            yield q;
        }
    };

    let mut entries = vec![];

    let s = dataset.select_record_stream(readable_stream);

    pin_mut!(s); // needed for iteration

    while let Some(entry) = s.next().await {
        let entry = entry?;

        entries.push(entry);
    }

    Ok(entries)
}
