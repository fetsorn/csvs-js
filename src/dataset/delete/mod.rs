use crate::{Entry, Result, Dataset};
mod strategy;
mod tablet;
use strategy::plan_delete;
use tablet::prune_tablet;

pub async fn delete_record(dataset: Dataset, query: Vec<Entry>) -> Result<()> {
    let schema = dataset.clone().build_schema().await?;

    for q in query {
        let strategy = plan_delete(&schema, &q)?;

        for tablet in strategy {
            prune_tablet(dataset.dir.clone(), tablet, q.clone()).await?;
        }
    }

    Ok(())
}
