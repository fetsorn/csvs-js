use crate::{Branch, Leaves, Schema, Trunks, line::Line, Entry, Error, Result, Dataset};
use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io::prelude::*;
use std::path::{Path, PathBuf};
use temp_dir::TempDir;
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
