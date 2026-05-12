use crate::{Result, Dataset, Entry};
mod strategy;
mod tablet;
mod line;
use strategy::plan_build;
use tablet::build_tablet;

pub async fn build_record(dataset: Dataset, query: Entry) -> Result<Entry> {
    let schema = dataset.get_schema().await?;

    let strategy = plan_build(&schema, &query);

    let mut entry = query;

    for tablet in strategy {
        entry = build_tablet(dataset.dir.clone(), tablet.clone(), entry.clone()).await?;
    }

    // if nothing is found, return input unchanged

    Ok(entry)
}
