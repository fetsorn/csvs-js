use crate::{Dataset, Result, Error};
use std::path::PathBuf;

pub async fn open(dir: &PathBuf) -> Result<Dataset> {
    // look for .csvs.csv in dataset.dir
    let root_version = dir.join(".csvs.csv");

    let is_root = std::fs::metadata(&root_version).is_ok();

    if is_root {
        return Ok(Dataset { dir: dir.clone() });
    } else {
        // if not found, look for csvs/
        let nested_dir = dir.join("csvs");

        let nested_version = nested_dir.join(".csvs.csv");

        // look for .csvs.csv in csvs/
        let is_nested = std::fs::metadata(&nested_version).is_ok();

        if is_nested {
            return Ok(Dataset { dir: nested_dir.clone() });
        }
    }

    return Err(Error::from_message("no dataset"))
}
