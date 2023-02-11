/**
 * This finds the root branch of a database schema.
 * @name findSchemaRoot
 * @function
 * @param {object} schema - Database schema.
 * @returns {string} - Root branch.
 */
export function findSchemaRoot(schema) {
  return Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
}

/**
 * This tells if a branch is connected to base branch.
 * @name isConnected
 * @function
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @param {string} branch - Branch name.
 * @returns {Boolean}
 */
function isConnected(schema, base, branch) {
  const { trunk } = schema[branch];

  if (trunk === undefined) {
    // if schema root is reached, leaf is connected to base
    return false;
  } if (trunk === base) {
    // if trunk is base, leaf is connected to base
    return true;
  } if (schema[trunk].type === 'object' || schema[trunk].type === 'array') {
    // if trunk is object or array, leaf is not connected to base
    // because objects and arrays have their own leaves
    return false;
  } if (isConnected(schema, base, trunk)) {
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
 * @param {object} schema - Database schema.
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
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of file paths.
 */
export function findCrownPaths(schema, base) {
  let filePaths = [];

  const crown = findCrown(schema, base);

  crown.concat([base]).forEach((branch) => {
    const { trunk } = schema[branch];

    if (trunk !== undefined && schema[branch].type !== 'regex') {
      filePaths.push(`metadir/pairs/${trunk}-${branch}.csv`);
    }

    switch (schema[branch].type) {
      case 'hash':
      case 'regex':
        break;

      case 'object':
      case 'array':
        if (branch !== base) {
          filePaths = filePaths.concat(findCrownPaths(schema, branch));
        }
        break;

      default:
        filePaths.push(`metadir/props/${schema[branch].dir ?? branch}/index.csv`);
    }
  });

  return filePaths.filter(Boolean).flat();
}
