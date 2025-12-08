use crate::{Result, Error};
use temp_dir::TempDir;
use text_file_sort::sort::Sort;
use std::path::Path;
use std::fs::rename;
use std::fs;

pub async fn sort_file(filepath: &Path) -> Result<()> {
    // must assign a variable to create the directory
    // must assign inside the stream scope to keep the directory
    let temp_d = TempDir::new();

    // on android <13 std::env::temp_dir() returns /data/local/tmp
    // which is inaccessible on some android systems
    let temp_d = match temp_d {
       Err(e) if e.kind() == std::io::ErrorKind::PermissionDenied => {
          TempDir::from_path(filepath.to_path_buf())
       }
       Err(e) => Err(e),
       Ok(td) => Ok(td)
    };

    let temp_d = temp_d?;

    let filename = match filepath.file_name() {
        None => return Err(Error::from_message("unexpected missing filename")),
        Some(s) => s,
    };

    let output = temp_d.as_ref().join(filename);

    Sort::new(vec![filepath.to_path_buf()], output.to_path_buf()).sort();

    rename(output, filepath)?;

    Ok(())
}
