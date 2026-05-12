use assert_json_diff::{assert_json_matches_no_panic, CompareMode, Config};
use csvs::{Branch, Entry, Leaves, Result, Schema, Trunks};
use csvs_test::read_testcase;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SchemaTest {
    name: String,
    entry: Value,
    schema: Value,
}

#[test]
fn entry_into_test() -> Result<()> {
    let tests: Vec<SchemaTest> = read_testcase("schema");

    for test in tests.iter() {
        let entry_string = serde_json::to_string(&test.entry)?;

        let entry: Entry = serde_json::from_str(&entry_string)?;

        let result: Schema = entry.try_into()?;

        let result_string: String = serde_json::to_string(&result)?;

        let r =
            assert_json_matches_no_panic(&result, &test.schema, Config::new(CompareMode::Strict));

        assert!(
            r.is_ok(),
            "{} failed\n{:#?}\n{:#?}",
            test.name,
            result,
            test.schema
        );
    }

    Ok(())
}

#[test]
fn find_crown_test() {
    let schema = Schema(HashMap::from([
        (
            "datum".to_owned(),
            Branch {
                trunks: Trunks(vec![]),
                leaves: Leaves(vec!["date".to_owned(), "name".to_owned()]),
            },
        ),
        (
            "date".to_owned(),
            Branch {
                trunks: Trunks(vec!["datum".to_owned()]),
                leaves: Leaves(vec![]),
            },
        ),
        (
            "name".to_owned(),
            Branch {
                trunks: Trunks(vec!["datum".to_owned()]),
                leaves: Leaves(vec![]),
            },
        ),
    ]));

    let mut crown = schema.find_crown("datum");

    crown.sort();

    assert_eq!(crown, vec!["date", "datum", "name"]);
}
