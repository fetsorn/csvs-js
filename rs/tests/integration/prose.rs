use assert_json_diff::{assert_json_matches_no_panic, Config, CompareMode};
use temp_dir::TempDir;
use serde_json::Value;
use csvs::{
    Result,
    Entry, IntoValue, Dataset
};
use csvs_test::{read_record, read_records, copy};
use std::fs;

#[tokio::test]
async fn build_without_prose_flag() -> Result<()> {
    let temp_path = TempDir::new()?;
    copy("prose_default", temp_path.path());

    let query: Entry = read_record("query_prose_japan").try_into()?;
    let dataset = Dataset::open(&temp_path.path().to_owned()).await?;
    let entry = dataset.build_record(query).await?;
    let entry_json = entry.into_value();

    let expected_json = read_record("record_prose_japan_no_prose");

    let r = assert_json_matches_no_panic(&entry_json, &expected_json, Config::new(CompareMode::Strict));
    assert!(r.is_ok(), "build without prose flag should not include @ keys\n{:#?}\n{:#?}", entry_json, expected_json);

    Ok(())
}

#[tokio::test]
async fn build_with_prose_flag() -> Result<()> {
    let temp_path = TempDir::new()?;
    copy("prose_default", temp_path.path());

    let query: Entry = read_record("query_prose_japan").try_into()?;
    let dataset = Dataset::open(&temp_path.path().to_owned()).await?;
    let entry = dataset.build_record_with_prose(query).await?;
    let entry_json = entry.into_value();

    let expected_json = read_record("record_prose_japan");

    let r = assert_json_matches_no_panic(&entry_json, &expected_json, Config::new(CompareMode::Strict));
    assert!(r.is_ok(), "build with prose flag should include @ keys\n{:#?}\n{:#?}", entry_json, expected_json);

    Ok(())
}

#[tokio::test]
async fn build_with_prose_flag_no_blobs() -> Result<()> {
    let temp_path = TempDir::new()?;
    copy("prose_default", temp_path.path());

    // climbed-everest has no prose blobs
    let query: Entry = read_record("query_prose_japan").try_into()?;
    let dataset = Dataset::open(&temp_path.path().to_owned()).await?;

    // build everest directly
    let everest = Entry::new("event");
    let everest = Entry {
        base: "event".to_string(),
        base_value: Some("climbed-everest".to_string()),
        leader_value: None,
        leaves: std::collections::HashMap::new(),
        prose: std::collections::HashMap::new(),
    };
    let entry = dataset.build_record_with_prose(everest).await?;
    let entry_json = entry.into_value();

    let expected_json = read_record("record_prose_everest");

    let r = assert_json_matches_no_panic(&entry_json, &expected_json, Config::new(CompareMode::Strict));
    assert!(r.is_ok(), "build with prose flag should work when no blobs exist\n{:#?}\n{:#?}", entry_json, expected_json);

    Ok(())
}

#[tokio::test]
async fn search_by_untagged_prose() -> Result<()> {
    let temp_path = TempDir::new()?;
    copy("prose_default", temp_path.path());

    let query: Entry = read_record("query_prose_search").try_into()?;
    let dataset = Dataset::open(&temp_path.path().to_owned()).await?;
    let entries = dataset.select_record(vec![query], true).await?;
    let entries_json: Vec<Value> = entries.iter().map(|i| i.clone().into_value()).collect();

    let expected_json = read_records(&vec!["record_prose_japan_light".to_string()]);

    let r = assert_json_matches_no_panic(&entries_json, &expected_json, Config::new(CompareMode::Strict));
    assert!(r.is_ok(), "search by untagged prose\n{:#?}\n{:#?}", entries_json, expected_json);

    Ok(())
}

#[tokio::test]
async fn search_by_tagged_prose() -> Result<()> {
    let temp_path = TempDir::new()?;
    copy("prose_default", temp_path.path());

    let query: Entry = read_record("query_prose_search_ru").try_into()?;
    let dataset = Dataset::open(&temp_path.path().to_owned()).await?;
    let entries = dataset.select_record(vec![query], true).await?;
    let entries_json: Vec<Value> = entries.iter().map(|i| i.clone().into_value()).collect();

    let expected_json = read_records(&vec!["record_prose_japan_light".to_string()]);

    let r = assert_json_matches_no_panic(&entries_json, &expected_json, Config::new(CompareMode::Strict));
    assert!(r.is_ok(), "search by tagged prose\n{:#?}\n{:#?}", entries_json, expected_json);

    Ok(())
}

#[tokio::test]
async fn insert_with_prose() -> Result<()> {
    let temp_path = TempDir::new()?;
    copy("prose_default", temp_path.path());

    let record: Entry = read_record("record_prose_insert").try_into()?;
    let dataset = Dataset::open(&temp_path.path().to_owned()).await?;
    dataset.insert_record(vec![record]).await?;

    // Check that the blob was written
    let blob_path = temp_path.path().join("prose").join("moved-to-bath.en");
    assert!(blob_path.exists(), "prose blob should be written");

    let content = fs::read_to_string(&blob_path)?;
    assert_eq!(content, "Relocated to Bath for work");

    // Check that the tablet was written without @ keys
    let tablet_path = temp_path.path().join("event-date.csv");
    let tablet_content = fs::read_to_string(&tablet_path)?;
    assert!(tablet_content.contains("moved-to-bath"), "tablet should contain the event");
    assert!(!tablet_content.contains("Relocated"), "tablet should not contain prose content");

    Ok(())
}
