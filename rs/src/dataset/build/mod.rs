use crate::{Result, Dataset, Entry};
mod strategy;
mod tablet;
mod line;
use strategy::plan_build;
use tablet::build_tablet;

pub async fn build_record(dataset: Dataset, query: Entry, prose: bool) -> Result<Entry> {
    let schema = dataset.get_schema().await?;

    let strategy = plan_build(&schema, &query);

    let mut entry = query;

    for tablet in strategy {
        entry = build_tablet(dataset.dir.clone(), tablet.clone(), entry.clone()).await?;
    }

    // if nothing is found, return input unchanged

    if prose {
        entry = with_prose(&dataset, entry)?;
    }

    Ok(entry)
}

fn with_prose(dataset: &Dataset, entry: Entry) -> Result<Entry> {
    let prose_map = match entry.base_value {
        Some(ref base_value) => dataset.prose_address.read_prose(&dataset.dir, base_value)?,
        None => std::collections::HashMap::new(),
    };

    let leaves = entry
        .leaves
        .into_iter()
        .map(|(key, entries)| {
            let new_entries: Result<Vec<Entry>> = entries
                .into_iter()
                .map(|leaf| with_prose(dataset, leaf))
                .collect();
            Ok((key, new_entries?))
        })
        .collect::<Result<std::collections::HashMap<_, _>>>()?;

    Ok(Entry {
        base: entry.base,
        base_value: entry.base_value,
        leader_value: entry.leader_value,
        leaves,
        prose: prose_map,
    })
}
