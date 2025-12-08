use crate::{line::Line, Branch, Dataset, Entry, Error, Leaves, Result, Schema, Trunks};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::fs::File;
use std::fs::OpenOptions;
use std::path::PathBuf;
use temp_dir::TempDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tablet {
    pub filename: String,
    pub trunk: String,
    pub branch: String,
}

pub fn plan_update(schema: &Schema, query: &Entry) -> Vec<Tablet> {
    let crown = schema.find_crown(&query.base);

    let tablets = crown.iter().fold(vec![], |with_branch, branch| {
        let trunks = match &schema.0.get(branch) {
            None => vec![],
            Some(Branch {
                trunks: Trunks(ts), ..
            }) => ts.to_vec(),
        };

        let tablets_new = trunks
            .iter()
            .map(|trunk| Tablet {
                filename: format!("{}-{}.csv", trunk, branch),
                trunk: trunk.to_owned(),
                branch: branch.to_owned(),
            })
            .collect();

        [with_branch, tablets_new].concat()
    });

    tablets
}
