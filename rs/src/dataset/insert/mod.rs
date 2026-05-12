use crate::{Entry, Result, Dataset};
use serde::{Deserialize, Serialize};
use std::fs;
mod tablet;
mod strategy;
mod sort;
use tablet::insert_tablet;
use strategy::plan_insert;

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
use sort::sort_file;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Tablet {
    pub filename: String,
    pub trunk: String,
    pub branch: String,
}

pub async fn insert_record(dataset: Dataset, query: Vec<Entry>) -> Result<()> {
    let schema = dataset.get_schema().await?;

    for q in query {
        // Recursively write prose blobs and strip @ keys before tablet insert
        write_prose_recursive(&dataset, &q)?;

        let mut stripped = q.clone();
        strip_prose_recursive(&mut stripped);

        let strategy = plan_insert(&schema, &stripped)?;

        for tablet in &strategy {
            insert_tablet(dataset.dir.clone(), tablet.clone(), stripped.clone()).await?;

            let filepath = dataset.dir.join(&tablet.filename);

            match fs::metadata(&filepath) {
                Err(_) => return Ok(()),
                Ok(m) => if m.len() == 0 {
                    // remove file if it is empty
                    fs::remove_file(filepath)?;
                } else {
                    sort_file(&filepath).await?;
                }
            }
        }
    }

    Ok(())
}
