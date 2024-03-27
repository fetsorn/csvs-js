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
 * @param {object} record - An expanded record.
 * @returns {object} - A condensed record.
 */
export function condense(schema, record) {
  const base = record._;

  const entries = Object.entries(record);

  const entriesCondensed = entries.filter(
    ([key, value]) => key !== "_" && key !== record._
  ).map(([branch, value]) => {
    const isTwig = Object.keys(schema)
                            .filter((b) => schema[b].trunk === branch)
                            .length === 0;

      if (Array.isArray(value)) {
        const itemsCondensed = isTwig
              ? value.map((item) => typeof value === "string" ? value : item[branch])
              : value.map((item) => condense(schema, item));

        if (itemsCondensed.length === 0) {
          return undefined
        }

        if (itemsCondensed.length === 1) {
          const valueCondensed = itemsCondensed[0];

          return [branch, valueCondensed]
        }

        return [branch, itemsCondensed]
      }

      if (typeof value === "object") {
        const valueCondensed = isTwig
              ? value[branch]
              : condense(schema, value);

        return [branch, valueCondensed]
      }

      if (typeof value === "string") {
        const valueCondensed = isTwig
              ? value
              : { _: branch, [branch]: value };

        return [branch, valueCondensed]
      }

      return undefined
  });

  const recordCondensed = Object.fromEntries(entriesCondensed.filter(Boolean));

  return { _: base, [base]: record[base], ...recordCondensed }
}

/**
 * This function expands the data structure
 * @name expand
 * @function
 * @param {object} record - A condensed record.
 * @returns {object} - An expanded record.
 */
export function expand(record) {
  const base = record._;

  const entries = Object.entries(record);

  const entriesExpanded = entries.filter(
    ([key, value]) => key !== "_" && key !== record._
  ).map(([key, value]) => {
    const valueExpanded = typeof value === "string"
          ? [ { _: key, [key]: value } ]
          : [ value ].flat().map(expand);

    return [key, valueExpanded]
  });

  const recordExpanded = Object.fromEntries(entriesExpanded);

  return { _: base, [base]: record[base], ...recordExpanded }
}
