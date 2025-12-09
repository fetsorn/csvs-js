use crate::{line::Line, Entry, Error, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::fs::File;
use std::fs::OpenOptions;
use std::path::PathBuf;
use temp_dir::TempDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct State {
    pub fst: Option<String>,
    pub is_match: bool,
    pub keys_inserted: Vec<String>,
    pub keys: Vec<String>,
}

pub fn update_line(state: State, line: Line) -> Result<State> {
    let mut keys_inserted = vec![];

    let fst_is_new = state.fst.is_none() || state.fst.as_ref() != Some(&line.key);

    if state.is_match && fst_is_new {
        keys_inserted.push(state.fst.clone().unwrap());
    }

    if fst_is_new {
        // insert and forget all record keys between previous and next
        let keys_between: Vec<String> = state
            .keys
            .iter()
            .filter(|key| !keys_inserted.contains(key))
            .filter(|key| {
                let is_first: bool = state.fst.is_none();

                let is_after: bool = is_first || state.fst.as_ref() <= Some(key);

                let is_before: bool = **key < line.key;

                let is_between: bool = is_after && is_before;

                is_between
            })
            .cloned()
            .collect();

        for key in keys_between {
            keys_inserted.push(key);
        }
    }

    let is_match: bool = state.keys.contains(&line.key);

    Ok(State {
        fst: Some(line.key),
        is_match,
        keys_inserted,
        keys: state.keys,
    })
}
