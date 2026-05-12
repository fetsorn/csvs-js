use super::strategy::Tablet;
use crate::{line::Line, Entry, Grain, Result};

#[derive(Debug, Clone)]
pub struct State {
    pub entry: Entry,
    pub is_match: bool,
    pub fst: Option<String>,
    pub last: Option<Entry>,
}

pub fn build_line(tablet: Tablet, grains: Vec<Grain>, state: State, line: Line) -> Result<State> {
    let mut state = state.clone();

    let fst = line.key;

    let snd = line.value;

    let fst_is_new = state.fst.is_none() || state.fst.as_ref() != Some(&fst.clone());

    state.fst = Some(fst.clone());

    let is_complete = state.is_match;

    let is_end_of_group = tablet.eager && fst_is_new;

    let push_end_of_group = is_end_of_group && is_complete;

    if push_end_of_group  {
        state.last = Some(state.clone().entry);

        return Ok(state);
    }

    let grain_new = Grain {
        base: tablet.trait_.to_owned(),
        base_value: Some(fst.to_owned()),
        leaf: tablet.thing.to_owned(),
        leaf_value: Some(snd.to_owned()),
    };

    for grain in grains {
        let re_str: String = match &grain.base_value {
            None => String::from(""),
            Some(s) => s.to_owned(),
        };

        let is_match_grain = re_str == fst.clone();

        state.is_match = if state.is_match {
            state.is_match
        } else {
            is_match_grain
        };

        if is_match_grain  {
            state.entry = state.entry.sow(&grain_new, &tablet.trait_, &tablet.thing);
        }
    }

    Ok(state)
}
