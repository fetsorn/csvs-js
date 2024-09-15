/**
 * This tells if a branch is connected to base branch.
 * @name isConnected
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} base - Base branch name.
 * @param {string} branch - Branch name.
 * @returns {Boolean}
 */
function isConnected(schema, base, branch) {
  const { trunk } = schema[branch];

  if (trunk === undefined) {
    // if schema root is reached, leaf is not connected to base
    return false;
  }
  if (trunk === base) {
    // if trunk is base, leaf is connected to base
    return true;
  }
  if (isConnected(schema, base, trunk)) {
    // if trunk is connected to base, leaf is also connected to base
    return true;
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
 * This finds paths to all files required to search for base branch.
 * @name findStorePaths
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of file paths.
 */
export function findCrownPaths(schema, base) {
  const crown = findCrown(schema, base);

  const filePaths = crown.concat([base]).map((branch) => {
    const schemaHasBranch = Object.prototype.hasOwnProperty.call(
      schema,
      branch,
    );

    if (schemaHasBranch) {
      const branchHasTrunk = Object.prototype.hasOwnProperty.call(
        schema[branch],
        "trunk",
      );

      if (branchHasTrunk) {
        const { trunk } = schema[branch];

        return `${trunk}-${branch}.csv`;
      }
    }
  });

  return filePaths.filter(Boolean).flat();
}

/**
 * counts number of leaves.
 * @name countLeaves
 * @export function
 * @param {string} branch - dataset entity.
 * @returns {number} - number of leaves
 */
export function countLeaves(schema, branch) {
  const leaves = Object.keys(schema).filter((b) => schema[b].trunk === branch);

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
    const { trunk: trunkA } = schema[a];

    const { trunk: trunkB } = schema[b];

    if (trunkA === b) {
      return -1;
    }

    if (trunkB === a) {
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
    const { trunk: trunkA } = schema[a];

    const { trunk: trunkB } = schema[b];

    if (trunkB === a) {
      return -1;
    }

    if (trunkA === b) {
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
