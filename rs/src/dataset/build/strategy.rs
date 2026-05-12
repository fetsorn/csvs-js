use crate::{Branch, Entry, Schema, Trunks};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tablet {
    pub filename: String,
    pub thing: String,
    pub trait_: String,
    pub thing_is_first: bool,
    pub trait_is_first: bool,
    pub base: String,
    pub trait_is_regex: bool,
    pub passthrough: bool,
    pub querying: bool,
    pub eager: bool,
    pub accumulating: bool,
}

pub fn plan_build(schema: &Schema, query: &Entry) -> Vec<Tablet> {
    let full_crown = schema.find_crown(&query.base);

    let mut crown: Vec<String> = full_crown
        .iter()
        .filter(|b| **b != query.base)
        .cloned()
        .collect();

    crown.sort_by(schema.clone().sort_nesting_descending());

    let value_tablets = crown.iter().fold(vec![], |with_branch, branch| {
        let trunks = match schema.0.get(branch) {
            None => vec![],
            Some(Branch {
                trunks: Trunks(ts), ..
            }) => ts.to_vec(),
        };

        let tablets_new = trunks
            .iter()
            .filter(|trunk| full_crown.contains(trunk))
            .map(|trunk| Tablet {
                thing: branch.to_owned(),
                trait_: trunk.to_owned(),
                thing_is_first: false,
                trait_is_first: true,
                base: trunk.to_owned(),
                filename: format!("{}-{}.csv", trunk, branch),
                trait_is_regex: false,
                accumulating: false,
                passthrough: true,
                querying: false,
                eager: *trunk == query.base,
            })
            .collect();

        [with_branch, tablets_new].concat()
    });

    value_tablets
}
