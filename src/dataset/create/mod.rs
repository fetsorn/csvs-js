use crate::{Dataset, Result, Error};
use std::path::PathBuf;

pub async fn create(dir: &PathBuf, nested: bool) -> Result<Dataset> {
    if (nested) {
        let nested_dir = dir.join("csvs");

        let nested_exists = std::fs::metadata(&nested_dir).is_ok();

        // check that path/name doesn't exist
        if nested_exists {
            return Err(Error::from_message(""))
        } else {
            // create directory name
            std::fs::create_dir_all(&nested_dir)?;

            // write .csvs.csv
            let version_path = nested_dir.join(".csvs.csv");

            std::fs::write(&version_path, "csvs,0.0.2")?;

            return Ok(Dataset { dir: nested_dir.clone() });
        }
    } else {
        let version_path = dir.join(".csvs.csv");

        let version_exists = std::fs::metadata(&version_path).is_ok();

        if version_exists {
            return Err(Error::from_message(""))
        } else {
            // write .csvs.csv
            std::fs::write(&version_path, "csvs,0.0.2")?;

            return Ok(Dataset { dir: dir.clone() });
        }
    }

    return Err(Error::from_message(""))
}
