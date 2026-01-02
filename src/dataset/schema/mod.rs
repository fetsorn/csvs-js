use crate::{Error, Result, Dataset, Entry, Schema};
use std::collections::HashMap;
use std::fs::File;

pub async fn select_schema(dataset: &Dataset) -> Result<Entry> {
    let filepath = dataset.dir.join("_-_.csv");

    let mut entry = Entry::new("_");

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

        let leaves = match entry.leaves.get(&trunk) { None => vec![], Some(ls) => ls.to_vec() };

        // append leaf
        let leaves_new = [leaves.clone(), vec![Entry {
            base: trunk.to_owned(),
            base_value: Some(leaf.to_owned()),
            leader_value: None,
            leaves: HashMap::new()
        }]].concat();

        // set leaves of trunk
        entry.leaves.insert(trunk.to_owned(), leaves_new);
    }

    Ok(entry)
}

pub async fn build_schema(dataset: &Dataset) -> Result<Schema> {
    let schema_record = dataset.select_schema().await?;

    Ok(schema_record.try_into()?)
}
