/**
 * This collapses a nested record into a list of key-value relations
 * @name recordToRelations
 * @param {object} record - A dataset record.
 * @export function
 * @returns {string[]} - A list of tuples (relation, key, value)
 */
export function recordToRelations(schema, record) {
  // { _: trunk, trunk: key, leaf: value, leaf: [ value ], leaf: { _: leaf, leaf: value } }

  const base = record._;

  // skip if record doesn't have the base
  if (record._ === undefined) return [];

  const key = record[base] ?? "";

  const leaves = Object.keys(schema).filter(
    (branch) => schema[branch].trunk === base,
  );

  // [ "base-leaf.csv", "key", "value" ]
  const relations = leaves.reduce((accLeaf, leaf) => {
    // skip if record doesn't have the leaf
    if (record[leaf] === undefined) return accLeaf;

    const values = Array.isArray(record[leaf]) ? record[leaf] : [record[leaf]];

    const pair = `${base}-${leaf}.csv`;

    const relationsLeaf = values.reduce((accValue, value) => {
      if (typeof value === "string") {
        return [...accValue, [pair, key, value]];
      }

      const valueNested = value[leaf] ?? "";

      const relationsNested = recordToRelations(schema, value);

      return [...accValue, [pair, key, valueNested], ...relationsNested];
    }, []);

    return [...accLeaf, ...relationsLeaf];
  }, []);

  return relations;
}
