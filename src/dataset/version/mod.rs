use crate::{Result, Dataset, Entry, line::Line};
use std::collections::HashMap;
use std::fs::File;

pub async fn select_version(dataset: &Dataset) -> Result<Entry> {
    let filepath = dataset.dir.join(".csvs.csv");

    let mut entry = Entry::new(".");

    if std::fs::metadata(&filepath).is_err() {
        return Ok(entry);
    }

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(File::open(&filepath)?);

    for result in rdr.records() {
        let record = result?;

        let trunk = match record.get(0) { None => String::from(""), Some(s) => s.to_owned() };

        let leaf = match record.get(1) { None => String::from(""), Some(s) => s.to_owned() };

        let leaf_entry = Entry {
            base: trunk.to_owned(),
            base_value: Some(leaf.to_owned()),
            leader_value: None,
            leaves: HashMap::new(),
        };

        entry.leaves.insert(trunk.to_owned(), vec![leaf_entry]);
    }

    Ok(entry)
}

pub async fn update_version(dataset: &Dataset, query: Entry) -> Result<()> {
    let filepath = dataset.dir.join(".csvs.csv");

    let filepath = File::create(&filepath)?;

    let mut wtr = csv::WriterBuilder::new()
        .has_headers(false)
        .from_writer(filepath);

    let mut keys: Vec<String> = query.leaves.clone().into_keys().collect();

    keys.sort();

    let mut lines: Vec<Line> = vec![];

    for trunk in keys {
        let leaves = query.leaves.get(&trunk).unwrap();

        for entry in leaves {
            let line = Line {
                key: entry.base.clone(),
                value: entry.base_value.clone().unwrap(),
            };

            lines.push(line);
        }
    }

    lines.sort();

    for line in lines {
        wtr.serialize(line)?;
    }

    wtr.flush()?;

    Ok(())
}
