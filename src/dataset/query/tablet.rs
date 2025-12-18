fn make_state_initial(state: State, tablet: Tablet) {
    // in a querying tablet, set initial entry to the base of the tablet
    // and preserve the received entry for sowing grains later
    // if tablet base is different from previous entry base
    // sow previous entry into the initial entry
    let is_same_base = tablet.base == state.query.base;

    let do_discard = state.entry.is_none() || is_same_base;

    let entry_fallback = if do_discard {
        Entry::new(&tablet.base)
    } else {
        state.entry
    }

    let do_sow = !do_discard;

    let entry_initial = if do_sow {
        let e = Entry::new(&tablet.base);

        let g = Grain {
            base: entry.base,
            base_value: entry.base_value,
            leaf: entry.base,
            leaf_value: None,
        };

        e.sow(g, tablet.base, entry.base)
    } else {
        entry_fallback
    }

    let entry_base_changed = entry.is_none() || entry.base != entry_initial.base;

    // if entry base changed forget thingQuerying
    let thing_query_initial = if entry_base_changed { None } else { Some(thing_querying) };

    let query_initial = query;

    let state = State {
        entry: entry_initial,
        query: query_initial,
        fst: None,
        is_match: false,
        thing_querying: thing_querying_initial,
    };

    return state
}

pub fn query_tablet_stream(
    dataset: Dataset,
    tablet: Tablet,
    state: State,
    is_first_tablet: bool,
) -> impl Stream<Item = Result<State>> {
    try_stream! {
        let filepath = dataset.dir.join(&tablet.filename);

        let mut empty = false;

        // first tablet needs lines
        // empty file is the same as "no matches"
        // later tablet avoids lines
        // empty file is the same as "matching all"
        let empty_is_good = !tablet_is_first && empty;

        if std::fs::metadata(&filepath).is_err() {
            return;
        }

        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .from_reader(File::open(&filepath)?);

        let state_initial = make_state_initial(state.clone(), tablet.clone());

        let mut state = state_initial;

        let grains = state.query.mow(tablet.trait_, tablet.thing);

        for result in rdr.records() {
            let record = result?;

            let line_escaped = Line {
                key: match record.get(0) { None => String::from(""), Some(s) => s.to_owned() },
                value: match record.get(1) { None => String::from(""), Some(s) => s.to_owned() }
            };

            let line = line_escaped.unescape();

            state = queryLine(
                tablet.clone(),
                grains.clone(),
                state_initial.clone(),
                state.clone(),
                line.clone(),
            );

            if state.last.is_some() {
                yield state.clone();

                state.last = None;
            }
        }
    }
}
