use crate::{Entry, Error, Result, Dataset};
use serde::{Deserialize, Serialize};
use std::fs;
mod tablet;
mod strategy;
mod sort;
use tablet::insert_tablet;
use strategy::plan_insert;
use sort::sort_file;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Tablet {
    pub filename: String,
    pub trunk: String,
    pub branch: String,
}

pub async fn insert_record(dataset: Dataset, query: Vec<Entry>) -> Result<()> {
    let schema = dataset.clone().select_schema().await?;

    let mut strategy = vec![];

    for q in query {
        strategy = plan_insert(&schema, &q)?;

        for tablet in &strategy {
            insert_tablet(dataset.dir.clone(), tablet.clone(), q.clone()).await?;

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
