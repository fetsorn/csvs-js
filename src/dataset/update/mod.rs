use crate::{Entry, Result, Dataset};
mod strategy;
mod tablet;
mod line;
use strategy::plan_update;
use tablet::update_tablet;

pub async fn update_record(dataset: Dataset, query: Vec<Entry>) -> Result<()> {
    let schema = dataset.clone().build_schema().await?;

    for q in query {
        let is_schema = q.base == "_";

        if is_schema {
            dataset.update_schema(q).await?;

            continue;
        }

        let is_version = q.base == ".";

        if is_version {
            dataset.update_version(q).await?;

            continue;
        }

        let strategy = plan_update(&schema, &q);

        for tablet in strategy {
            update_tablet(dataset.dir.clone(), tablet, q.clone()).await?;
        }
    }

    Ok(())
}
