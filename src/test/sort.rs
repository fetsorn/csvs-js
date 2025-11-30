use assert_json_diff::assert_json_eq;
use csvs::{Entry, Result, Schema};
use csvs_test::{read_record, read_testcase};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LevelTest {
    schema: String,
    initial: String,
    expected: i32,
}

#[test]
fn level_test() -> Result<()> {
    let tests: Vec<LevelTest> = read_testcase("get_nesting_level");

    for test in tests.iter() {
        let schema_record = read_record(&test.schema);

        let schema: Schema = schema_record.try_into()?;

        let level = schema.get_nesting_level(&test.initial);

        assert_eq!(level, test.expected);
    }

    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SortTest {
    schema: String,
    initial: Vec<String>,
    expected: Vec<String>,
}

#[test]
fn sort_descending_test() -> Result<()> {
    let tests: Vec<SortTest> = read_testcase("sort_descending");

    for test in tests.iter() {
        let schema_record = read_record(&test.schema);

        let schema: Schema = schema_record.try_into()?;

        let mut sorted = test.initial.clone();

        sorted.sort_by(schema.sort_nesting_descending());

        assert_eq!(sorted, test.expected);
    }

    Ok(())
}

#[test]
fn sort_ascending_test() -> Result<()> {
    let tests: Vec<SortTest> = read_testcase("sort_ascending");

    for test in tests.iter() {
        let schema_record = read_record(&test.schema);

        let schema: Schema = schema_record.try_into()?;

        let mut sorted = test.initial.clone();

        sorted.sort_by(schema.sort_nesting_ascending());

        assert_eq!(sorted, test.expected);
    }

    Ok(())
}
