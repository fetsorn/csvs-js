use crate::{Error, Result, Dataset, Entry, Schema};
mod strategy;
mod tablet;
mod line;
use strategy::plan_build;
use tablet::build_tablet;

pub async fn build_record(dataset: Dataset, query: Entry) -> Result<Entry> {
    let schema = dataset.clone().select_schema().await?;

    let strategy = plan_build(&schema, &query);

    let mut entry = query;

    for tablet in strategy {
        entry = build_tablet(dataset.dir.clone(), tablet, entry.clone()).await?;
    }

    Ok(entry)
}
