/**
 * This tells if a branch is connected to base branch.
 * @name isConnected
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} base - Base branch name.
 * @param {string} branch - Branch name.
 * @returns {Boolean}
 */
export function isConnected(schema, base, branch) {
  if (branch === base) {
    // if branch is base, it is connected
    return true;
  }

  const { trunks } = schema[branch];

  for (const trunk of trunks) {
    if (trunk === undefined) {
      // if schema root is reached, leaf is not connected to base
      continue;
    }

    if (trunk === base) {
      // if trunk is base, leaf is connected to base
      return true;
    }

    if (isConnected(schema, base, trunk)) {
      // if trunk is connected to base, leaf is also connected to base
      return true;
    }
  }

  // if trunk is not connected to base, leaf is also not connected to base
  return false;
}

/**
 * This finds all branches that are connected to the base branch.
 * @name findCrown
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of leaf branches connected to the base branch.
 */
export function findCrown(schema, base) {
  return Object.keys(schema).filter((branch) =>
    isConnected(schema, base, branch),
  );
}

/**
 * counts number of leaves.
 * @name countLeaves
 * @export function
 * @param {string} branch - dataset entity.
 * @returns {number} - number of leaves
 */
export function countLeaves(schema, branch) {
  const { leaves } = schema[branch];

  return leaves.length;
}

/**
 * sort by level of nesting, twigs and leaves come first
 * @name sortNestingAscending
 * @export function
 * @param {string} a - dataset entity.
 * @param {string} b - dataset entity.
 * @returns {number} - sorting index, a<b -1, a>b 1, a==b 0
 */
export function sortNestingAscending(schema) {
  return (a, b) => {
    const { trunks: trunkA } = schema[a];

    const { trunks: trunkB } = schema[b];

    if (trunkA.includes(b)) {
      return -1;
    }

    if (trunkB.includes(a)) {
      return 1;
    }

    if (countLeaves(schema, a) < countLeaves(schema, b)) {
      return -1;
    }

    if (countLeaves(schema, a) > countLeaves(schema, b)) {
      return 1;
    }

    return 0;
  };
}

/**
 * sort by level of nesting, trunks come first
 * @name sortNestingDescending
 * @export function
 * @param {string} a - dataset entity.
 * @param {string} b - dataset entity.
 * @returns {number} - sorting index, a<b -1, a>b 1, a==b 0
 */
export function sortNestingDescending(schema) {
  return (a, b) => {
    const { trunks: trunkA } = schema[a];

    const { trunks: trunkB } = schema[b];

    if (trunkB.includes(a)) {
      return -1;
    }

    if (trunkA.includes(b)) {
      return 1;
    }

    if (countLeaves(schema, a) > countLeaves(schema, b)) {
      return -1;
    }

    if (countLeaves(schema, a) < countLeaves(schema, b)) {
      return 1;
    }

    return 0;
  };
}

function append(list, item) {
  const isEmpty = list === undefined || list.length === 0;

  // use flat instead of spread here in case list is one item
  return isEmpty ? [item] : [list, item].flat();
}

export function toSchema(schemaRecord) {
  const invalidRecord = !Object.hasOwn(schemaRecord, "_") || schemaRecord._ !== "_";

  if (invalidRecord) return {}

  const { _: omit, ...record } = schemaRecord;

  return Object.entries(record).reduce((withEntry, [trunk, value]) => {
    const leaves = Array.isArray(value) ? value : [value];

    return leaves.reduce((withLeaf, leaf) => {
      const trunkOld = withLeaf[trunk] ?? {};

      const trunkTrunks = trunkOld.trunks ?? [];

      const trunkLeaves =
            withLeaf[trunk] !== undefined
            ? append(withLeaf[trunk].leaves, leaf)
            : [ leaf ];

      const trunkPartial = {
        [trunk]: {
          leaves: trunkLeaves,
          trunks: trunkTrunks,
        }
      };

      const leafOld = withLeaf[leaf] ?? {};

      const leafTrunks =
        withLeaf[leaf] !== undefined
            ? append(withLeaf[leaf].trunks, trunk)
            : [ trunk ];

      const leafLeaves = leafOld.leaves ?? [];

      const leafPartial = {
        [leaf]: {
          trunks: leafTrunks,
          leaves: leafLeaves,
        }
      };

      return { ...withLeaf, ...trunkPartial, ...leafPartial };
    }, withEntry);
  }, {});
}
