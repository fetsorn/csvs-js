use super::{Branch, Schema, Trunks};

/// Nesting level = distance from a leaf node in the schema graph.
/// Leaves (no trunks) are level 0, their trunks are level 1, etc.
/// E.g. for datum -> filepath -> moddate: moddate=0, filepath=1, datum=2.
pub fn get_nesting_level(schema: &Schema, branch: &str) -> i32 {
    let trunks = match schema.0.get(branch) {
        None => vec![],
        Some(Branch {
            trunks: Trunks(ts), ..
        }) => ts.to_vec(),
    };

    let trunk_levels: Vec<i32> = trunks
        .iter()
        .map(|trunk| get_nesting_level(schema, trunk))
        .collect();

    let level: i32 = *trunk_levels.iter().max().unwrap_or(&-1);

    level + 1
}
