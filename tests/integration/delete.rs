extern crate dir_diff;
use csvs::{Entry, Result, Dataset};
use serde::{Deserialize, Serialize};
use std::fs;
use temp_dir::TempDir;
use csvs_test::{read_record, copy, read_testcase, assert_dir};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DeleteTest {
    initial: String,
    query: Vec<String>,
    expected: String,
}

#[tokio::test]
async fn delete_test() -> Result<()> {
    let tests: Vec<DeleteTest> = read_testcase("delete");

    for test in tests.iter() {
        let temp_path = TempDir::new()?;

        copy(&test.initial, temp_path.path());

        let queries: Vec<Entry> = test
            .query
            .iter()
            .map(|query| read_record(&query).try_into())
            .collect::<Result<Vec<Entry>>>()?;

        let dataset = Dataset::open(&temp_path.path().to_owned()).await?;

        dataset.delete_record(queries).await;

        assert_dir!(temp_path, &test.expected);
    }

    Ok(())
}
