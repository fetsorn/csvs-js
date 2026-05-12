use crate::{line::Line, Result};
use std::fs;
use std::path::Path;

/// Sort a CSV tablet file by its first field (key), parsed and unescaped.
/// This matches the ordering assumed by update_line (Rust's standard String
/// comparison on unescaped keys).
pub async fn sort_file(filepath: &Path) -> Result<()> {
    let content = match fs::read_to_string(filepath) {
        Ok(c) => c,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(e.into()),
    };

    if content.is_empty() {
        return Ok(());
    }

    // Parse each line with the csv crate, extract the key, unescape it for sorting
    let mut lines_with_keys: Vec<(String, String)> = Vec::new();

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(content.as_bytes());

    for result in rdr.records() {
        let record = result?;
        let key_escaped = record.get(0).unwrap_or("").to_owned();
        let value_escaped = record.get(1).unwrap_or("").to_owned();

        let line = Line {
            key: key_escaped,
            value: value_escaped,
        };
        let unescaped = line.unescape();
        let sort_key = unescaped.key;

        // Reconstruct the raw CSV line for writing back
        let mut wtr = csv::WriterBuilder::new()
            .has_headers(false)
            .from_writer(Vec::new());
        wtr.serialize(&line)?;
        wtr.flush()?;
        let raw = String::from_utf8_lossy(&wtr.into_inner().unwrap_or_default()).to_string();

        lines_with_keys.push((sort_key, raw));
    }

    lines_with_keys.sort_by(|a, b| a.0.cmp(&b.0));

    let sorted: String = lines_with_keys
        .into_iter()
        .map(|(_, raw)| raw)
        .collect();

    fs::write(filepath, sorted)?;

    Ok(())
}
