use std::path::PathBuf;
use std::fs::File;
use std::fs;
use std::fs::OpenOptions;
use crate::{line::Line, Entry, Result};
use super::Tablet;

pub async fn insert_tablet(path: PathBuf, tablet: Tablet, entry: Entry) -> Result<()> {
    let filepath = path.join(&tablet.filename);

    // create file if it doesn't exist
    if fs::metadata(&filepath).is_err() {
        File::create(&filepath)?;
    }

    let file = OpenOptions::new()
        .append(true)
        .open(filepath)
        .expect("cannot open file");

    let mut wtr = csv::WriterBuilder::new()
        .has_headers(false)
        .from_writer(file);

    let grains = entry.mow(&tablet.trunk, &tablet.branch);

    let lines: Vec<Line> = grains.iter().filter(|grain| grain.leaf_value.is_some()).map(|grain| {
        Line {
            key: match &grain.base_value { None => String::from(""), Some(s) => s.to_owned() },
            value: match &grain.leaf_value { None => String::from(""), Some(s) => s.to_owned() }
        }
    }).collect();

    for line in lines.iter() {
        wtr.serialize(line.escape())?;
    }

    Ok(())
}
