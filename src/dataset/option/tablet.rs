pub struct State {
    pub fst: String,
}

pub struct DoubleBuffer {
    pub current: State,
    pub last: Option<State>,
}

pub fn select_option_stream<S: Stream<Item = Result<Entry>>>(
    dataset: Dataset,
    tablet: Tablet,
    state: DoubleBuffer,
) -> impl Stream<Item = Result<Entry>> {
    try_stream! {
        let filepath = path.join(&tablet.filename);

        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .from_reader(File::open(&filepath)?);

        let mut state = DoubleBuffer {
            current: State {
                query,
                entry: Entry { base: tablet.base }
                fst: None,
                is_match: false,
                match_map: state.matchMap,
            },
            last: None
        };

        for result in rdr.records() {
            let record = result?;

            let line_escaped = Line {
                key: match record.get(0) { None => String::from(""), Some(s) => s.to_owned() },
                value: match record.get(1) { None => String::from(""), Some(s) => s.to_owned() }
            };

            let line = line_escaped.unescape();

            let stateLine = option_line(tablet, state.current, line);

            if (stateLine.last.is_some) {
                yield stateLine;
            }

            state.current = stateLine.current;
        }

        if state.current.is_match yield state
    }
}
