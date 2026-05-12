use crate::{Dataset, Result, Error};
use std::path::PathBuf;

pub async fn create(dir: &PathBuf, bare: bool) -> Result<Dataset> {
    if bare  {
        let version_path = dir.join(".csvs.csv");

        println!("{:?}", std::fs::metadata(&version_path));

        let _version_exists = std::fs::metadata(&version_path).is_ok();

        // write .csvs.csv
        std::fs::write(&version_path, "csvs,0.0.2\n")?;

        return Ok(Dataset { schema_cache: None, dir: dir.clone() });
    } else {
        let nested_dir = dir.join("csvs");

        let nested_exists = std::fs::metadata(&nested_dir).is_ok();

        // check that path/name doesn't exist
        if nested_exists {
            return Err(Error::from_message("dataset exists"))
        } else {
            // create directory name
            std::fs::create_dir_all(&nested_dir)?;

            // write .csvs.csv
            let version_path = nested_dir.join(".csvs.csv");

            std::fs::write(&version_path, "csvs,0.0.2\n")?;

            return Ok(Dataset { schema_cache: None, dir: nested_dir.clone() });
        }
    }
}
