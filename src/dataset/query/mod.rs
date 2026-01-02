use crate::{Error, Result, Dataset, Entry, Schema};
use futures_core::stream::{BoxStream, Stream};
use std::collections::HashMap;
use std::pin::{Pin, pin};
use async_stream::{stream, try_stream};
use futures_util::pin_mut;
use futures_util::stream::StreamExt;
mod tablet;
mod line;
mod strategy;
use strategy::{plan_query, Tablet};
use tablet::{query_tablet_stream};
use line::State;

fn get_previous_state(
    state_map: &HashMap<usize, State>,
    query: Entry,
    c: usize
) -> State {
    let resumed = state_map.get(&c);

    if let Some(state) = resumed {
            return state.clone();
    }

    if c == 0 {
        return State::new(query.clone());
    }

    get_previous_state(state_map, query, c - 1)
}

fn stop_iterator(stream_map: &mut HashMap<usize, Pin<Box<dyn Stream<Item = Result<State>>>>>, c: usize) {
    stream_map.remove(&c);
}

fn init_iterator(dataset: Dataset, state_map: &mut HashMap<usize, State>, stream_map: &mut HashMap<usize, Pin<Box<dyn Stream<Item = Result<State>>>>>, tablet: Tablet, c: usize, s: State) {
    let is_first_tablet = c == 0;

    let tablet_stream = query_tablet_stream(dataset, tablet.clone(), s.clone(), is_first_tablet);

    stream_map.insert(c, tablet_stream.boxed());

    state_map.insert(c, s);
}

pub fn query_record_stream(
    dataset: Dataset,
    query: Entry,
) -> impl Stream<Item = Result<Entry>> {
    try_stream! {
        let schema = dataset.clone().select_schema().await?;

        let strategy = plan_query(&schema, &query);

        let mut counter: usize = 0;

        // persist the state of each stream?
        let mut state_map: HashMap<usize, State> = HashMap::new();

        let mut stream_map: HashMap<usize, Pin<Box<dyn Stream<Item = Result<State>>>>> = HashMap::new();

        // a while loop that takes a counter
        // and a map of counter to stream and state
        while true {
            // initialize the stream for the current counter
            if state_map.get(&counter).is_none() {
                let state_previous = get_previous_state(
                    &state_map,
                    query.clone(),
                    counter
                );

                init_iterator(
                    dataset.clone(),
                    &mut state_map,
                    &mut stream_map,
                    strategy[counter].clone(),
                    counter,
                    state_previous
                );
            }

            // get the stream for the current counter
            let tablet_stream: &mut Pin<Box<dyn Stream<Item = Result<State>>>> = stream_map.get_mut(&counter).unwrap();

            let is_first_tablet = counter == 0;

            let is_last_tablet = counter == (strategy.len() - 1);

            // call .next on the stream
            let value = tablet_stream.next().await;

            // TODO replace with if let Some(value) = value
            if value.is_none() {
                if is_first_tablet {
                    // if first tablet is over, close stream
                    return;
                } else {
                    // if later tablet is over, close iterator
                    stop_iterator(&mut stream_map, counter);

                    // and resume the previous tablet
                    counter = counter - 1;

                    continue;
                }
            } else {
                let value = value.unwrap()?;

                if is_last_tablet {
                    // if last tablet, yield value
                    if let Some(entry) = value.entry {
                        yield entry;
                    } else {
                        return;
                    }
                } else {
                    // if earlier tablet, start the next tablet
                    counter = counter + 1;

                    // pass state to the next tablet
                    init_iterator(
                        dataset.clone(),
                        &mut state_map,
                        &mut stream_map,
                        strategy[counter].clone(),
                        counter,
                        value
                    );

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
