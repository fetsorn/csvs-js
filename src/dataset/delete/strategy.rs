use crate::{line::Line, Branch, Dataset, Entry, Error, Leaves, Result, Schema, Trunks};
use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io::prelude::*;
use std::path::{Path, PathBuf};
use temp_dir::TempDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tablet {
    pub filename: String,
    pub trait_: String,
    pub trait_is_first: bool,
}

pub fn plan_delete(schema: &Schema, query: &Entry) -> Result<Vec<Tablet>> {
    let (trunks, leaves) = match schema.0.get(&query.base) {
        None => (vec![], vec![]),
        Some(Branch {
            trunks: Trunks(ts),
            leaves: Leaves(ls),
        }) => (ts.to_vec(), ls.to_vec()),
    };

    let base_value = match &query.base_value {
        None => return Err(Error::from_message("unexpected missing option")),
        Some(v) => v,
    };

    let trunk_tablets: Vec<Tablet> = trunks
        .iter()
        .map(|trunk| Tablet {
            filename: format!("{}-{}.csv", trunk, query.base),
            trait_: base_value.to_owned(),
            trait_is_first: false,
        })
        .collect();

    let leaf_tablets = leaves
        .iter()
        .map(|leaf| Tablet {
            filename: format!("{}-{}.csv", query.base, leaf),
            trait_: base_value.to_owned(),
            trait_is_first: true,
        })
        .collect();

    Ok([trunk_tablets, leaf_tablets].concat())
}
