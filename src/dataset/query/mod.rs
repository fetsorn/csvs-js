use crate::{Error, Result, Dataset, Entry, Schema};
use futures_core::stream::{BoxStream, Stream};
use std::collections::HashMap;
mod strategy;
use async_stream::{stream, try_stream};
use futures_util::pin_mut;
use futures_util::stream::StreamExt;
mod tablet;
mod line;
mod strategy;
use strategy::plan_option;
use tablet::{option_tablet_stream};
use line::State;

struct TBN {
    stream: BoxStream<'static, Result<State>>,
    state: State
}

pub fn select_option_stream(
    dataset: Dataset,
    query: Entry,
) -> impl Stream<Item = Result<Option<State>>> {
    try_stream! {
        let schema = dataset.clone().select_schema().await?;

        let strategy = plan_query(&schema, &query.base);

        let mut counter: usize = 0;

        // persist the state of each stream?
        let mut stateMap: HashMap<usize, TBN> = HashMap::New();

        fn get_previous_state(c: usize) -> State {
            let resumed = stateMap.get(c);

            if resumed.is_some() {
                return resumed.unwrap().state;
            }

            if c == 0 {
                return State::new(query);
            }

            get_previous_state(c - 1)
        }

        // TODO a while loop that takes a counter
        // and a map of counter to stream and state
        while true {
            // initialize the stream for the current counter
            if stateMap.get(counter).is_none() {
                let tablet = strategy[counter];

                let state = get_previous_state(counter);

                let is_first_tablet = counter == 0;

                let tablet_stream = query_tablet_stream(dataset.clone(), tablet.clone(), state.clone(), is_first_tablet);

                stateMap.set(counter, tablet_stream);
            }

            // get the stream for the current counter
            let tablet_stream = stateMap.get(counter).unwrap().stream;

            let is_first_tablet = counter == 0;

            let is_last_tablet = counter == (strategy.length() - 1);

            // call .next on the stream
            let value = tablet_stream.next().await;

            if value.is_none() {
                if is_first_tablet {
                    // if first tablet is over, close stream
                    yield None;
                } else {
                    // if later tablet is over, close iterator
                    // has to consume the state map?
                    // should I pass it as a parameter
                    stop_iterator(counter);

                    // and resume the previous tablet
                    counter--;

                    continue;
                }
            } else {
                let value = value.unwrap();

                if is_last_tablet {
                    // if last tablet, yield value
                    yield Some(value);
                } else {
                    // if earlier tablet, start the next tablet
                    counter++;

                    // pass state to the next tablet
                    state_map.set(counter, value);

                    continue;
                }
            }
        }
    }
}

pub async fn query_record(dataset: Dataset, query: Entry) -> Result<Vec<Entry>> {
    let mut entries = vec![];

    let stream = dataset.query_record_stream(query);

    pin_mut!(stream); // needed for iteration

    while let Some(value) = stream.next().await {
        entries.push(value?);
    }

    Ok(entries)
}
