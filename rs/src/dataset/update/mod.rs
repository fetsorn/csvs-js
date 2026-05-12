use crate::{Entry, Result, Dataset};
mod strategy;
mod tablet;
mod line;
use strategy::plan_update;
use tablet::update_tablet;

pub async fn update_record(dataset: Dataset, query: Vec<Entry>) -> Result<()> {
    let schema = dataset.get_schema().await?;

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

        // Write prose blobs and strip @ keys before tablet update
        if !q.prose.is_empty() {
            if let Some(ref base_value) = q.base_value {
                for (lang, content) in &q.prose {
                    dataset.prose_address.write_prose(
                        &dataset.dir,
                        base_value,
                        lang.as_deref(),
                        content,
                    )?;
                }
            }
        }

        let mut stripped = q.clone();
        stripped.prose.clear();

        let strategy = plan_update(&schema, &stripped);

        for tablet in strategy {
            update_tablet(dataset.dir.clone(), tablet, stripped.clone()).await?;
        }
    }

    Ok(())
}
