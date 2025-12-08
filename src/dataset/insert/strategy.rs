use super::Tablet;
use crate::{Entry, Error, Result, Schema};

pub fn plan_insert(schema: &Schema, query: &Entry) -> Result<Vec<Tablet>> {
    let crown = schema.find_crown(&query.base);

    let tablets = crown.iter().try_fold(vec![], |with_branch, branch| {
        let node = match schema.0.get(branch) {
            None => return Err(Error::from_message("unexpected missing branch")),
            Some(vs) => vs,
        };

        let tablets_new = node
            .trunks
            .0
            .iter()
            .map(|trunk| Tablet {
                filename: format!("{}-{}.csv", trunk, branch),
                trunk: trunk.to_owned(),
                branch: branch.to_owned(),
            })
            .collect();

        Ok([with_branch, tablets_new].concat())
    });

    Ok(tablets?)
}
