use super::line::{query_line, State};
use super::strategy::Tablet;
use crate::{line::Line, Dataset, Entry, Error, Grain, Result, Schema};
use async_stream::{stream, try_stream};
use futures_core::stream::{BoxStream, Stream};
use futures_util::pin_mut;
use futures_util::stream::StreamExt;
use std::collections::HashMap;
use std::fs;
use std::fs::File;

fn make_state_initial(state: State, tablet: Tablet) -> State {
    // in a querying tablet, set initial entry to the base of the tablet
    // and preserve the received entry for sowing grains later
    // if tablet base is different from previous entry base
    // sow previous entry into the initial entry
    let is_same_base = tablet.base == state.query.base;

    let do_discard = state.entry.is_none() || is_same_base;

    let entry_fallback = if do_discard {
        Entry::new(&tablet.base)
    } else {
        state.entry.clone().unwrap()
    };

    let do_sow = !do_discard;

    let entry_initial = if do_sow {
        let e = Entry::new(&tablet.base);

        let g = Grain {
            base: state.entry.clone().unwrap().base,
            base_value: state.entry.clone().unwrap().base_value,
            leaf: state.entry.clone().unwrap().base,
            leaf_value: None,
        };

        e.sow(&g, &tablet.base, &state.entry.clone().unwrap().base)
    } else {
        entry_fallback
    };

    let entry_base_changed =
        state.entry.is_none() || state.entry.unwrap().base != entry_initial.base;

    // if entry base changed forget thingQuerying
    let thing_querying_initial = if entry_base_changed {
        None
    } else {
        state.thing_querying
    };

    let query_initial = state.query;

    let state = State {
        entry: Some(entry_initial),
        query: query_initial,
        fst: None,
        is_match: false,
        thing_querying: thing_querying_initial,
        last: None,
        match_map: HashMap::new(),
    };

    return state;
}

pub fn query_tablet_stream(
    dataset: Dataset,
    tablet: Tablet,
    state: State,
    is_first_tablet: bool,
) -> impl Stream<Item = Result<State>> {
    try_stream! {
        let filepath = dataset.dir.join(&tablet.filename);

        // error when file is empty
        if std::fs::metadata(&filepath).is_err() {
            // first tablet needs lines
            // empty file is the same as "no matches"
            // later tablet avoids lines
            // empty file is the same as "matching all"
            let empty_is_good = !is_first_tablet;

            if empty_is_good {
                let mut state = state.clone();

                state.last = Some(Box::new(state.clone()));

                yield state;

                return;
            } else {
                return;
            }
        }

        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .from_reader(File::open(&filepath)?);

        let state_initial = make_state_initial(state.clone(), tablet.clone());

        let mut state = state_initial.clone();

        let grains = state.query.mow(&tablet.trait_, &tablet.thing);

        for result in rdr.records() {
            let record = result?;

            let line_escaped = Line {
                key: match record.get(0) { None => String::from(""), Some(s) => s.to_owned() },
                value: match record.get(1) { None => String::from(""), Some(s) => s.to_owned() }
            };

            let line = line_escaped.unescape();

            state = query_line(
                tablet.clone(),
                grains.clone(),
                state_initial.clone(),
                state.clone(),
                line.clone(),
            )?;

            if let Some(last) = state.last {
                yield *last;

                state.last = None;
            }
        }

        if state.is_match {
            yield state;
        }
    }
}
