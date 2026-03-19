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

fn gather_keys(query: &Entry) -> Vec<String> {
    let leaves = query.leaves.keys().filter(|key| match &query.base_value {
        None => true,
        Some(s) => key != &s,
    });

    leaves.fold(vec![], |with_leaf, leaf| {
        let leaf_keys = match &query.leaves.get(leaf) {
            None => vec![],
            Some(vs) => vs.iter().fold(vec![], |with_key, item| {
                let has_leaves = item.leaves.keys().len() > 0;

                let keys_item_new = if has_leaves {
                    gather_keys(item)
                } else {
                    vec![]
                };

                [with_key, keys_item_new].concat()
            }),
        };

        [&with_leaf[..], &[leaf.to_owned()], &leaf_keys[..]].concat()
    })
}

pub fn plan_query(schema: &Schema, query: &Entry) -> Vec<Tablet> {
    let mut queried_branches = gather_keys(query);

    queried_branches.sort_by(schema.clone().sort_nesting_ascending());

    let queried_tablets = queried_branches.iter().fold(vec![], |with_branch, branch| {
        let trunks = match schema.0.get(branch) {
            None => vec![],
            Some(Branch {
                trunks: Trunks(ts), ..
            }) => ts.to_vec(),
        };

        let tablets_new: Vec<Tablet> = trunks
            .iter()
            .map(|trunk| Tablet {
                thing: trunk.to_owned(),
                trait_: branch.to_owned(),
                thing_is_first: true,
                trait_is_first: false,
                base: trunk.to_owned(),
                filename: format!("{}-{}.csv", trunk, branch),
                trait_is_regex: true,
                passthrough: false,
                querying: true,
                eager: true,
                accumulating: false,
            })
            .collect();

        [with_branch, tablets_new].concat()
    });

    // TODO js has baseIsTrunkTablets
    // which doesn't happen in the test suite right now

    queried_tablets
}
