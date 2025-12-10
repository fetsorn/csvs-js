use super::line::{option_line, DoubleBuffer, State};
use super::strategy::Tablet;
use crate::{line::Line, Dataset, Entry, Error, Result, Schema};
use async_stream::{stream, try_stream};
use futures_core::stream::{BoxStream, Stream};
use futures_util::pin_mut;
use futures_util::stream::StreamExt;
use std::collections::HashMap;
use std::fs;
use std::fs::File;

pub fn option_tablet_stream(
    dataset: Dataset,
    tablet: Tablet,
    state: State,
) -> impl Stream<Item = Result<DoubleBuffer>> {
    try_stream! {
        let filepath = dataset.dir.join(&tablet.filename);

        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .from_reader(File::open(&filepath)?);

        let mut state = DoubleBuffer {
            current: state,
            last: None
        };

        for result in rdr.records() {
            let record = result?;

            let line_escaped = Line {
                key: match record.get(0) { None => String::from(""), Some(s) => s.to_owned() },
                value: match record.get(1) { None => String::from(""), Some(s) => s.to_owned() }
            };

            let line = line_escaped.unescape();

            let stateLine = option_line(tablet.clone(), state.current, line)?;

            state.current = stateLine.clone().current;

            if (stateLine.last.is_some()) {
                yield stateLine;
            }
        }

        if state.current.is_match { yield state }
    }
}
