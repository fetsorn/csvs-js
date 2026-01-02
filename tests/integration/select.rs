use assert_json_diff::{assert_json_matches_no_panic, Config, CompareMode};
use temp_dir::TempDir;
use serde_json::Value;
use csvs::{
    Result,
    Entry, IntoValue, Dataset
};
use csvs_test::{read_record, read_records, copy, read_testcase};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SelectTest {
    name: String,
    initial: String,
    query: Vec<String>,
    expected: Vec<String>,
}

#[tokio::test]
async fn select_test() -> Result<()> {
    let tests: Vec<SelectTest> = read_testcase("select");

    for test in tests.iter() {
        let temp_path = TempDir::new()?;

        copy(&test.initial, temp_path.path());

        // parse query to Entry
        let queries: Vec<Entry> = test
            .query
            .iter()
            .map(|query| read_record(&query).try_into())
            .collect::<Result<Vec<Entry>>>()?;

        let dataset = Dataset::new(&temp_path.path().to_owned());

        let entries = dataset.select_record(queries).await?;

        let entries_json: Vec<Value> = entries.iter().map(|i| i.clone().into_value()).collect();

        let expected_json: Vec<Value> = read_records(&test.expected);

        let r = assert_json_matches_no_panic(&entries_json, &expected_json, Config::new(CompareMode::Strict));

        assert!(r.is_ok(), "{} failed\n{:#?}\n{:#?}", test.name, entries_json, expected_json);
    }

    Ok(())
}
