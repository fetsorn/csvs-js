use crate::{Error, Result, Dataset, Entry, Schema};
use async_stream::{stream, try_stream};
use futures_core::stream::{BoxStream, Stream};
use futures_util::pin_mut;
use futures_util::stream::StreamExt;
use std::collections::HashMap;
mod tablet;
mod line;
mod strategy;
use strategy::plan_option;
use tablet::{option_tablet_stream};
use line::State;

pub fn select_option_stream(
    dataset: Dataset,
    query: Entry,
) -> impl Stream<Item = Result<Entry>> {
    try_stream! {
        let schema = dataset.clone().select_schema().await?;

        let strategy = plan_option(&schema, &query.base);

        let mut state = State {
            query: query.clone(),
            entry: Entry::new(&query.base),
            fst: None,
            is_match: false,
            match_map: HashMap::new(),
            last: None,
        };

        for tablet in strategy {
            let tablet_stream = option_tablet_stream(dataset.clone(), tablet, state.clone());

            pin_mut!(tablet_stream); // needed for iteration

            while let Some(value) = tablet_stream.next().await {
                state = value?;

                yield state.last.unwrap();

                state.last = None;
            }
        }
    }
}

pub async fn select_option(dataset: Dataset, query: Entry) -> Result<Vec<Entry>> {
    let mut entries = vec![];

    let stream = dataset.select_option_stream(query);

    pin_mut!(stream); // needed for iteration

    while let Some(value) = stream.next().await {
        entries.push(value?);
    }

    Ok(entries)
}
