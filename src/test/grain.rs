use assert_json_diff::assert_json_eq;
use csvs::{Grain, IntoValue, Result};
use csvs_test::read_testcase;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct GrainTest {
    value: Value,
    grain: Value,
}

#[test]
fn grain_try_from_test() -> Result<()> {
    let tests: Vec<GrainTest> = read_testcase("grain");

    for test in tests.iter() {
        let result: Grain = test.value.clone().try_into()?;

        let result_string = serde_json::to_string(&result)?;

        let result_json: Value = serde_json::from_str(&result_string)?;

        assert_json_eq!(result_json, test.grain);
    }

    Ok(())
}

#[test]
fn grain_into_test() -> Result<()> {
    let tests: Vec<GrainTest> = read_testcase("grain");

    for test in tests.iter() {
        let grain_string = serde_json::to_string(&test.grain)?;

        let grain: Grain = serde_json::from_str(&grain_string)?;

        let result: Value = grain.into_value();

        assert_json_eq!(result, test.value);
    }

    Ok(())
}
