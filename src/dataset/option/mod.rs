use std::collections::HashMap;
use tokio_stream::Stream;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::Duration;
mod tablet;
mod strategy;
use strategy::plan_option;
use tablet::{DoubleBuffer, State, option_tablet_stream};

pub fn select_option_stream<S: Stream<Item = Result<Entry>>>(
    dataset: Dataset,
    query: Entry,
) -> impl Stream<Item = Result<Entry>> {
    try_stream! {
        let schema = dataset.clone().select_schema().await?;

        let strategy = plan_option(&schema, &query.base);

        let mut state = DoubleBuffer {
            current: State {
                query,
                matchMap: HashMap::new(),
            },
            last: None,
        };

        for tablet in strategy {
            let tablet_stream = option_tablet_stream(dataset, tablet, state);

            pin_mut!(tablet_stream); // needed for iteration

            while let Some(value) = tablet_stream.next().await {
                yield value.last.entry;

                state.current = value.current;
            }
        }
    }
}

pub async fn select_option(dataset: Dataset, query: Entry) -> Result<Vec<Entry>> {

    let mut entries = vec![];

    let stream = select_option_stream();

    pin_mut!(stream); // needed for iteration

    while let Some(value) = stream.next().await {
        entries.push(value);
    }

    Ok(entries)
}
