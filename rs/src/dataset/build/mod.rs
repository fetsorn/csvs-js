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
        if let Some(ref base_value) = entry.base_value {
            let prose_map = dataset.prose_address.read_prose(&dataset.dir, base_value)?;
            entry.prose = prose_map;
        }
    }

    Ok(entry)
}
