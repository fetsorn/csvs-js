use crate::{Entry, Result, Dataset};
mod strategy;
mod tablet;
mod line;
use strategy::plan_update;
use tablet::update_tablet;

fn write_prose_recursive(dataset: &Dataset, entry: &Entry) -> Result<()> {
    if !entry.prose.is_empty() {
        if let Some(ref base_value) = entry.base_value {
            for (lang, content) in &entry.prose {
                dataset.prose_address.write_prose(
                    &dataset.dir,
                    base_value,
                    lang.as_deref(),
                    content,
                )?;
            }
        }
    }
    for entries in entry.leaves.values() {
        for leaf in entries {
            write_prose_recursive(dataset, leaf)?;
        }
    }
    Ok(())
}

fn strip_prose_recursive(entry: &mut Entry) {
    entry.prose.clear();
    for entries in entry.leaves.values_mut() {
        for leaf in entries.iter_mut() {
            strip_prose_recursive(leaf);
        }
    }
}

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

        // Recursively write prose blobs and strip @ keys before tablet update
        write_prose_recursive(&dataset, &q)?;

        let mut stripped = q.clone();
        strip_prose_recursive(&mut stripped);

        let strategy = plan_update(&schema, &stripped);

        for tablet in strategy {
            update_tablet(dataset.dir.clone(), tablet, stripped.clone()).await?;
        }
    }

    Ok(())
}
