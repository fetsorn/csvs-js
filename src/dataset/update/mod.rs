use crate::{Branch, Entry, Error, Leaves, line::Line, Result, Schema, Trunks, Dataset};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::fs::File;
use std::fs::OpenOptions;
use std::path::PathBuf;
use temp_dir::TempDir;
mod strategy;
mod tablet;
mod line;
use strategy::plan_update;
use tablet::update_tablet;

pub async fn update_record(dataset: Dataset, query: Vec<Entry>) -> Result<()> {
    let schema = dataset.clone().select_schema().await?;

    for q in query {
        let strategy = plan_update(&schema, &q);

        for tablet in strategy {
            update_tablet(dataset.dir.clone(), tablet, q.clone()).await?;
        }
    }

    Ok(())
}
