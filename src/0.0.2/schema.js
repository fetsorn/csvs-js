/**
 * This finds the root branch of a dataset schema.
 * @name findSchemaRoot
 * @function
 * @param {object} schema - Dataset schema.
 * @returns {string} - Root branch.
 */
export function findSchemaRoot(schema) {
  const firstRoot = Object.keys(schema).find((branch) => !Object.prototype.hasOwnProperty.call(schema[branch], 'trunk'));

  return firstRoot;
}

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
  } else if (trunk === base) {
    // if trunk is base, leaf is connected to base
    return true;
  } else if (isConnected(schema, base, trunk)) {
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
  return Object.keys(schema).filter((branch) => isConnected(schema, base, branch));
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
    const schemaHasBranch = Object.prototype.hasOwnProperty.call(schema, branch)

    if (schemaHasBranch) {
      const branchHasTrunk = Object.prototype.hasOwnProperty.call(schema[branch], "trunk")

      if (branchHasTrunk) {
        const { trunk } = schema[branch];

        return `${trunk}-${branch}.csv`;
      }
    }
  });

  return filePaths.filter(Boolean).flat();
}

/**
 * This function condenses the data structure where possible
 * @name condense
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} branch - Branch name.
 * @param {object[]} records - List of expanded records.
 * @returns {object[]} - List of condensed records.
 */
export function condense(schema, branch, records) {
  if (records !== undefined && records.length > 0) {
    const hasLeaves = Object.keys(schema)
                            .filter((b) => schema[b].trunk === branch)
                            .length > 0;

    if (records.length === 1) {
      return hasLeaves ? records[0] : records[0][branch]
    }

    return records.map((record) => hasLeaves ? record : record[branch])
  }

  return []
}
