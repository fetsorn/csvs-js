use super::Schema;
use std::cmp::Ordering;
use std::collections::HashMap;

pub fn sort_nesting_descending(schema: Schema) -> impl FnMut(&String, &String) -> Ordering {
    // Precompute levels once so each comparison is O(1).
    let levels: HashMap<String, i32> = schema
        .0
        .keys()
        .map(|k| (k.clone(), schema.get_nesting_level(k)))
        .collect();

    move |a, b| {
        let level_a = levels.get(a).copied().unwrap_or(0);

        let level_b = levels.get(b).copied().unwrap_or(0);

        if level_a < level_b {
            return Ordering::Less;
        }

        if level_a > level_b {
            return Ordering::Greater;
        }

        a.cmp(b)
    }
}
