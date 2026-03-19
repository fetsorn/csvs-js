use super::strategy::Tablet;
use crate::{line::Line, Entry, Error, Grain, Result};
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

    let grain_new = match tablet.thing_is_first {
        true => match tablet.trait_is_first {
            true => Grain {
                base: tablet.thing.to_owned(), // why not trait?
                base_value: Some(line.key.to_owned()),
                leaf: tablet.thing.to_owned(), // why not trait?
                leaf_value: None,
            },
            false => Grain {
                base: tablet.thing.to_owned(), // why not trait?
                base_value: Some(line.key.to_owned()),
                leaf: tablet.trait_.to_owned(),
                leaf_value: Some(line.value.to_owned()),
            },
        },
        false => match tablet.trait_is_first {
            true => Grain {
                base: tablet.trait_.to_owned(),
                base_value: Some(line.key.to_owned()),
                leaf: tablet.thing.to_owned(),
                leaf_value: Some(line.value.to_owned()),
            },
            false => Grain {
                base: tablet.base.to_owned(),
                base_value: None,
                leaf: tablet.base.to_owned(),
                leaf_value: None,
            },
        },
    };

    let is_match_grains = grains.into_iter().fold(None, |with_grain, grain| {
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
            let re = Regex::new(&re_str).ok()?;

            re.is_match(&trait_)
        } else {
            re_str == trait_.clone()
        };

        let both_match = match with_grain {
            None => is_match_grain,
            Some(with_grain) => with_grain && is_match_grain,
        };

        Some(both_match)
    });

    // when querying also match literal trait from the query
    // otherwise always true
    let do_diff = state_initial.thing_querying.is_some();

    let is_match_querying = if do_diff {
        state_initial.thing_querying.as_ref() == Some(&thing)
    } else {
        true
    };

    let is_match = is_match_grains.unwrap_or(false) && is_match_querying;

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
            None => return Err(Error::from_message("query_line: state.entry is None when match found")),
            Some(e) => Some(e.sow(&grain_new, &tablet.trait_, &tablet.thing)),
        };

        state.query = state.query.sow(&grain_new, &tablet.trait_, &tablet.thing);
    }

    Ok(state)
}
