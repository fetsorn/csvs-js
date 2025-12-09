pub fn option_line(tablet: Tablet, state: State, line: Line) -> Result<DoubleBuffer> {
    let mut last = None;

    let mut state = state;

    let fst_is_new = state.fst.is_none() || state.fst.as_ref() != Some(&line.key);

    state.fst = line.key;

    let push_end_of_group = fst_is_new && state.is_match;

    if push_end_of_group {
        last = Some(state);

        state.entry = Entry { base: tablet.base };

        state.is_match = false;
    }

    let base = if tablet.thing_is_first {
        line.key.to_owned()
    } else {
        line.value.to_owned()
    };

    let grain_new = Grain {
        base: tablet.base.to_owned(),
        base_value: Some(base),
        leaf: tablet.base.to_owned(),
        leaf_value: None,
    };

    let re_str = base;

    let re = Regex::new(&re_str)?;

    let is_match = re.is_match(state.query.base_value);

    let match_is_new = match state.match_map {
        None => true,
        Some(m) => m.get(&thing).is_none(),
    };

    state.is_match = if state.is_match {
        state.is_match
    } else {
        is_match && match_is_new
    };

    if is_match && match_is_new {
        match state.match_map.as_mut() {
            None() => (),
            Some(m) => m.insert(base, true);
        };

        // if previous querying tablet already matched thing
        // the trait in this record is likely to be the same
        // and might duplicate in the entry after sow
        let is_new_thing = match &state_initial.thing_querying {
            None => true,
            Some(t) => t != &thing,
        };

        if is_new_thing {
            state.query = match &state.query {
                None => panic!("unreachable"),
                Some(q) => Some(q.sow(&grain_new, &tablet.trait_, &tablet.thing)),
            };
        }
    }

    Ok(DoubleBuffer {
        current: state,
        last
    })
}
