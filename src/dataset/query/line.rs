use super::strategy::Tablet;
use crate::{line::Line, Dataset, Entry, Error, Grain, Result, Schema};
use regex::Regex;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct State {
    pub query: Entry,
    pub entry: Option<Entry>,
    pub fst: Option<String>,
    pub is_match: bool,
    pub match_map: HashMap<String, bool>,
    pub last: Option<Box<State>>,
    pub thing_querying: Option<String>,
}

impl State {
    pub fn new(query: Entry) -> Self {
        State {
            query: query,
            entry: None,
            fst: None,
            is_match: false,
            match_map: HashMap::new(),
            last: None,
            thing_querying: None,
        }
    }
}

fn make_state_line(
    state_initial: State,
    state: State,
    tablet: Tablet,
    grains: Vec<Grain>,
    trait_: String,
    thing: String,
) -> Result<State> {
    let mut state = state;

    let grain_new = Grain {
        base: tablet.base,
        base_value: Some(trait_.clone()),
        leaf: tablet.thing.clone(),
        leaf_value: Some(thing.clone()),
    };

    for grain in grains {
        let re_str: String = if tablet.trait_is_first {
            match &grain.base_value {
                None => String::from(""),
                Some(s) => s.to_owned(),
            }
        } else {
            match &grain.leaf_value {
                None => String::from(""),
                Some(s) => s.to_owned(),
            }
        };

        let is_match_grain = if tablet.trait_is_regex {
            let re = Regex::new(&re_str)?;

            re.is_match(&trait_)
        } else {
            re_str == trait_.clone()
        };

        // when querying also match literal trait from the query
        // otherwise always true
        let do_diff = state_initial.thing_querying.is_some();

        let is_match_querying = if do_diff {
            state_initial.thing_querying.as_ref() == Some(&thing)
        } else {
            true
        };

        let is_match = is_match_grain && is_match_querying;

        state.is_match = if state.is_match {
            state.is_match
        } else {
            is_match
        };

        if state.is_match {
            state.thing_querying = Some(thing.to_owned())
        }

        if is_match {
            state.entry = match &state.entry {
                None => panic!("unreachable"),
                Some(e) => Some(e.sow(&grain_new, &tablet.trait_, &tablet.thing)),
            };
        }

        // if previous querying tablet already matched thing
        // the trait in this record is likely to be the same
        // and might duplicate in the entry after sow
        let is_new_thing = match &state_initial.thing_querying {
            None => true,
            Some(t) => t != &thing,
        };

        if is_new_thing {
            state.query = state.query.sow(&grain_new, &tablet.trait_, &tablet.thing);
        }
    }

    Ok(state)
}

pub fn query_line(
    tablet: Tablet,
    grains: Vec<Grain>,
    state_initial: State,
    state: State,
    line: Line,
) -> Result<State> {
    let mut state = state;

    let fst_is_new = state.fst.is_none() || state.fst.as_ref() != Some(&line.key);

    state.fst = Some(line.key.clone());

    let push_end_of_group = fst_is_new && state.is_match;

    if push_end_of_group {
        state.last = Some(Box::new(state.clone()));

        state.entry = state_initial.entry.clone();

        state.query = state_initial.query.clone();

        state.is_match = false;
    }

    let trait_ = if tablet.trait_is_first {
        line.key.to_owned()
    } else {
        line.value.to_owned()
    };

    let thing = if tablet.thing_is_first {
        line.key.to_owned()
    } else {
        line.value.to_owned()
    };

    state = make_state_line(state_initial, state, tablet, grains, trait_, thing)?;

    Ok(state)
}
