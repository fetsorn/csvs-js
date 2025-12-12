use crate::{Branch, Entry, Leaves, Schema, Trunks};
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

pub fn plan_option(schema: &Schema, base: &str) -> Vec<Tablet> {
    let empty = (Trunks(vec![]), Leaves(vec![]));

    let (trunks, leaves) = match schema.0.get(base) {
        None => (vec![], vec![]),
        Some(Branch {
            trunks: Trunks(ts),
            leaves: Leaves(ls),
        }) => (ts.to_vec(), ls.to_vec()),
    };

    let trunk_tablets: Vec<Tablet> = trunks
        .iter()
        .map(|trunk| Tablet {
            thing: base.to_owned(),
            trait_: base.to_owned(),
            thing_is_first: false,
            trait_is_first: false,
            base: base.to_owned(),
            filename: format!("{}-{}.csv", trunk, base),
            trait_is_regex: true,
            passthrough: false,
            querying: false,
            eager: true,
            accumulating: true,
        })
        .collect();

    let leaf_tablets = leaves
        .iter()
        .map(|leaf| Tablet {
            thing: base.to_owned(),
            trait_: base.to_owned(),
            thing_is_first: true,
            trait_is_first: true,
            base: base.to_owned(),
            filename: format!("{}-{}.csv", base, leaf),
            trait_is_regex: true,
            accumulating: true,
            passthrough: false,
            querying: false,
            eager: true,
        })
        .collect();

    [leaf_tablets, trunk_tablets].concat()
}
