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

export function getNestingLevel(schema, branch) {
  const { trunks } = schema[branch];

  const trunkLevels = trunks.map((trunk) => getNestingLevel(schema, trunk));

  const level = trunkLevels.reduce((a, b) => Math.max(a, b), -1);

  return level+1
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
    const levelA = getNestingLevel(schema, a);

    const levelB = getNestingLevel(schema, b);

    if (levelA > levelB) {
      return -1
    }

    if (levelA < levelB) {
      return 1
    }

    return b.localeCompare(a);
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
    const levelA = getNestingLevel(schema, a);

    const levelB = getNestingLevel(schema, b);

    if (levelA < levelB) {
      return -1
    }

    if (levelA > levelB) {
      return 1
    }

    return a.localeCompare(b);
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

  return Object.entries(record).reduce((withTrunk, [trunk, value]) => {
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
    }, withTrunk);
  }, {});
}
