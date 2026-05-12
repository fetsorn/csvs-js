extern crate include_dir;
extern crate serde_json;
extern crate temp_dir;
use include_dir::{include_dir, Dir};
use serde_json::Value;
use std::fs;
use std::io::prelude::*;
use std::path::Path;

pub static CASES_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/cases");
pub static RECORDS_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/records");
pub static DATASETS_DIR: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/datasets");

pub fn read_record(loadname: &str) -> Value {
    let filename = format!("{}.json", loadname);

    let file = RECORDS_DIR
        .get_file(filename)
        .expect("should be a json file");

    let json: Value = serde_json::from_reader(file.contents()).expect("file should be proper JSON");

    json
}

pub fn read_records(loadnames: &Vec<String>) -> Vec<Value> {
    loadnames.iter().map(|r| read_record(r)).collect()
}

pub fn read_testcase<R: serde::de::DeserializeOwned>(loadname: &str) -> Vec<R> {
    let filename = format!("{}.json", loadname);

    let file = CASES_DIR.get_file(filename).expect("should be a json file");

    let tests: Vec<R> =
        serde_json::from_reader(file.contents()).expect("file should be proper JSON");

    tests
}

pub fn copy(loadname: &str, temp_path: &Path) -> Result<(), std::io::Error> {
    let dataset = DATASETS_DIR.get_dir(loadname).unwrap();

    copy_dir_recursive(dataset, temp_path, loadname)
}

fn copy_dir_recursive(dir: &Dir<'_>, temp_path: &Path, prefix: &str) -> Result<(), std::io::Error> {
    for file_entry in dir.files() {
        let relative = file_entry
            .path()
            .strip_prefix(prefix)
            .unwrap_or(file_entry.path());

        let dest = temp_path.join(relative);

        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut file = fs::File::create(&dest)?;

        file.write_all(file_entry.contents())?;
    }

    for subdir in dir.dirs() {
        copy_dir_recursive(subdir, temp_path, prefix)?;
    }

    Ok(())
}

#[macro_export]
macro_rules! assert_dir {
    ($temp_path:expr, $expected_path:expr) => {
        let check_path = temp_dir::TempDir::new()?;

        copy($expected_path, check_path.path());

        if dir_diff::is_different($temp_path.path(), check_path.path())? {
            for file_entry in fs::read_dir($temp_path.path())? {
                let file_entry = file_entry?;

                let file_type = file_entry.file_type()?;

                if file_type.is_dir() {
                } else {
                    let received = fs::read_to_string(file_entry.path())?;

                    let expected =
                        fs::read_to_string(check_path.path().join(file_entry.file_name()))?;

                    assert_eq!(received, expected);
                }
            }
        }

        assert!(!dir_diff::is_different(
            $temp_path.path(),
            check_path.path()
        )?);
    };
}
