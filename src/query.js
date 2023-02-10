import { grepPolyfill, randomUUIDPolyfill } from './polyfill';

/**
 * This splits string on newlines and filters empty lines.
 * @name splitLines
 * @function
 * @param {string} str - Newline separated lines.
 * @returns {string[]} - Array of lines.
 */
function splitLines(str) {
  return str.split('\n').filter((line) => line !== '');
}

/**
 * This takes a UUID from a database entry.
 * @name takeUUID
 * @function
 * @param {string} line - Entry line.
 * @returns {string} - UUID.
 */
function takeUUID(line) {
  return line.slice(0, 64);
}

/**
 * This takes a value from a database entry.
 * @name takeValue
 * @function
 * @param {string} line - Entry line.
 * @returns {string} - Value.
 */
function takeValue(line) {
  return line.slice(65).replace(/\n*$/, '');
}

/**
 * This takes UUIDs from database entries.
 * @name takeUUIDs
 * @function
 * @param {string} line - Newline separated entry lines.
 * @returns {string[]} - UUIDs.
 */
function takeUUIDs(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeUUID(line));

  return uuids;
}

/**
 * This takes values from database entries.
 * @name takeValues
 * @function
 * @param {string} line - Newline separated entry lines.
 * @returns {string[]} - Values.
 */
function takeValues(str) {
  const lines = splitLines(str.replace(/\n*$/, ''));

  const uuids = lines.map((line) => takeValue(line));

  return uuids;
}

/**
 * This finds the root branch of a database schema.
 * @name findSchemaRoot
 * @function
 * @param {object} schema - Database schema.
 * @returns {string} - Root branch.
 */
function findSchemaRoot(schema) {
  return Object.keys(schema).find((prop) => !Object.prototype.hasOwnProperty.call(schema[prop], 'trunk'));
}

/**
 * This tells if a leaf branch is connected to base branch.
 * @name isLeaf
 * @function
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @param {string} leaf - Leaf branch name.
 * @returns {Boolean}
 */
export function isLeaf(schema, base, leaf) {
  const { trunk } = schema[leaf];

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
  } if (isLeaf(schema, base, trunk)) {
    // if trunk is connected to base, leaf is also connected to base
    return true;
  }

  // if trunk is not connected to base, leaf is also not connected to base
  return false;
}

/**
 * This finds all branches that are connected to the base branch.
 * @name findLeaves
 * @function
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of leaf branches connected to the base branch.
 */
function findLeaves(schema, base) {
  return Object.keys(schema).filter((branch) => isLeaf(schema, base, branch));
}

/**
 * This finds paths to all files required to search for base branch.
 * @name findStorePaths
 * @function
 * @param {object} schema - Database schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of file paths.
 */
function findStorePaths(schema, base) {
  let filePaths = [];

  const leaves = findLeaves(schema, base);

  leaves.concat([base]).forEach((branch) => {
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
          filePaths = filePaths.concat(findStorePaths(schema, branch));
        }
        break;

      default:
        filePaths.push(`metadir/props/${schema[branch].dir ?? branch}/index.csv`);
    }
  });

  return filePaths.filter(Boolean).flat();
}

/**
 * This finds all UUIDs of the branch.
 * @name findAllUUIDs
 * @function
 * @param {object} store - Map of file paths to file contents.
 * @param {object} schema - Database schema.
 * @param {string} branch - Branch name.
 * @returns {string[]} - Array of leaf branches connected to the base branch.
 */
function findAllUUIDs(store, schema, branch) {
  const { trunk } = schema[branch];

  return trunk === undefined
    ? takeUUIDs(store[`metadir/props/${schema[branch].dir ?? branch}/index.csv`])
    : takeValues(store[`metadir/pairs/${trunk}-${branch}.csv`]);
}

/** Class representing a database query. */
export default class Query {
  /**
   * This callback reads db.
   * @callback readFileCallback
   * @param {string} path - The file path.
   * @returns {string} - The file contents
   */

  /**
   * readFile is the callback that reads db.
   * @type {readFileCallback}
   */
  #readFile;

  /**
   * This callback writes db.
   * @callback writeFileCallback
   * @param {string} path - The file path.
   * @param {string} contents - The file contents.
   */

  /**
   * writeFile is the callback that writes db.
   * @type {writeFileCallback}
   */
  #writeFile;

  /**
   * This callback searches files.
   * @callback grepCallback
   * @param {string} contents - The file contents.
   * @param {string} regex - The regular expression in ripgrep format.
   * @returns {string} - The search results
   */

  /**
   * grep is the callback that searches files.
   * @type {grepCallback}
   */
  #grep;

  /**
   * This callback returns a UUID.
   * @callback randomUUIDCallback
   * @returns {string} - UUID compliant with RFC 4122
   */

  /**
   * randomUUID is the callback that returns a UUID.
   * @type {randomUUIDCallback}
   */
  #randomUUID;

  /**
   * schema is the database schema.
   * @type {object}
   */
  #schema;

  /**
   * searchParams are the search parameters.
   * @type {URLSearchParams}
   */
  #searchParams;

  /**
   * base is the branch to search for.
   * @type {URLSearchParams}
   */
  #base;

  /**
   * store is the map of file paths to file contents.
   * @type {URLSearchParams}
   */
  #store;

  /**
   * Create a database instance.
   * @param {Object} args - Object with callbacks.
   * @param {readFileCallback} args.readFile - The callback that reads db.
   * @param {writeFileCallback} args.writeFile - The callback that writes db.
   * @param {grepCallback} args.grep - The callback that searches files.
   * @param {randomUUIDCallback} args.randomUUID - The callback that returns a UUID.
   * @param {URLSearchParams} args.searchParams - The search parameters.
   * @param {string} args.base - The field to search for.
   */
  constructor({
    readFile, writeFile, grep, randomUUID, searchParams, base,
  }) {
    this.#readFile = readFile;
    this.#writeFile = writeFile;
    this.#grep = grep ?? grepPolyfill;
    this.#randomUUID = randomUUID ?? crypto.randomUUID ?? randomUUIDPolyfill;
    this.#searchParams = searchParams;
    this.#base = base;
  }

  /**
   * This returns an array of entries from the database.
   * @name run
   * @function
   * @returns {Object[]}
   */
  async run() {
    this.#schema = await this.#readSchema();

    this.#searchParams = this.#searchParams ?? new URLSearchParams();

    // if no base is provided, find schema root
    this.#base = this.#base ?? findSchemaRoot(this.#schema);

    // get a map of database file contents
    this.#store = await this.#readStore(this.#base);

    // get an array of base UUIDs
    const baseUUIDs = await this.#searchUUIDs(this.#base);

    // get an array of entries
    const entries = await this.#buildEntries(this.#base, baseUUIDs);

    return entries;
  }

  /**
   * This returns the database schema.
   * @name readSchema
   * @function
   * @returns {object} - database schema.
   */
  async #readSchema() {
    return JSON.parse(await this.#readFile('metadir.json'));
  }

  /**
   * This returns a map of database file contents.
   * @name readStore
   * @function
   * @param {string} base - Base branch.
   * @returns {Map} - Map of file paths to file contents.
   */
  async #readStore(base) {
    // get array of all filepaths required to search for base branch
    const filePaths = findStorePaths(this.#schema, base);

    const store = {};

    await Promise.all(filePaths.map(async (filePath) => {
      store[filePath] = (await this.#readFile(filePath)) ?? '\n';
    }));

    return store;
  }

  /**
   * This returns an array of base UUIDs.
   * @name searchUUIDs
   * @function
   * @param {string} base - Base branch.
   * @returns {string[]} - Array of base UUIDs.
   */
  async #searchUUIDs(base) {
    // get array of all UUIDs of the base branch
    const baseUUIDSets = [findAllUUIDs(this.#store, this.#schema, base)];

    const searchEntries = Array.from(this.#searchParams.entries()).filter(
      ([key]) => key !== 'groupBy' && key !== 'overviewType',
    );

    // grep against every search result until reaching a common set of UUIDs
    await Promise.all(searchEntries.map(async ([branch, value]) => {
      switch (this.#schema[branch].type) {
        case 'rule': {
          const { trunk } = this.#schema[branch];

          const trunkLines = await this.#grep(
            this.#store[`metadir/props/${this.#schema[trunk].dir ?? trunk}/index.csv`],
            this.#store[`metadir/props/${this.#schema[branch].dir ?? branch}/rules/${value}.rule`],
          );

          const trunkUUIDs = takeUUIDs(trunkLines);

          if (trunk === base) {
            baseUUIDSets.push(trunkUUIDs);
          } else {
            baseUUIDSets.push(await this.#findBaseUUIDs(base, trunk, trunkUUIDs));
          }

          break;
        }

        default: {
          const branchValue = this.#schema[branch].type === 'string'
            ? JSON.stringify(value)
            : value;

          const branchLine = await this.#grep(
            this.#store[`metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`],
            `,${branchValue}$`,
          );

          const branchUUIDs = [takeUUID(branchLine)];

          if (branch === base) {
            baseUUIDSets.push(branchUUIDs);
          } else {
            baseUUIDSets.push(await this.#findBaseUUIDs(base, branch, branchUUIDs));
          }
        }
      }
    }));

    const baseUUIDs = baseUUIDSets.reduce((a, b) => a.filter((c) => b.includes(c)));

    return baseUUIDs;
  }

  /**
   * This returns an array of base UUIDs related to branch UUIDs.
   * @name findBaseUUIDs
   * @function
   * @param {string} base - Base branch.
   * @param {string} branch - Branch name.
   * @param {string[]} branchUUIDs - Array of branch UUIDs.
   * @returns {string[]} - Array of base UUIDs.
   */
  async #findBaseUUIDs(base, branch, branchUUIDs) {
    const { trunk } = this.#schema[branch];

    const pairLines = await this.#grep(
      this.#store[`metadir/pairs/${trunk}-${branch}.csv`],
      branchUUIDs.join('\n'),
    );

    const trunkUUIDs = takeUUIDs(pairLines);

    if (trunk === base) {
      return trunkUUIDs;
    }

    return this.#findBaseUUIDs(base, trunk, trunkUUIDs);
  }

  /**
   * This returns an array of entries.
   * @name buildEntries
   * @function
   * @param {string} base - Base branch.
   * @param {string[]} baseUUIDs - Array of base UUIDs.
   * @returns {object[]} - Array of entries.
   */
  async #buildEntries(base, baseUUIDs) {
    const entries = [];

    await Promise.all(baseUUIDs.map(async (baseUUID) => {
      entries.push(await this.#buildEntry(base, baseUUID));
    }));

    return entries;
  }

  /**
   * This returns an entry.
   * @name buildEntry
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @returns {object} - Entry.
   */
  async #buildEntry(base, baseUUID) {
    const entry = { UUID: baseUUID };

    switch (this.#schema[base].type) {
      case 'object':
        entry.item_name = base;
        break;

      case 'array':
        entry.items = [];
        break;

      default:
        entry[base] = await this.#findBranchValue(base, baseUUID);
    }

    // find all branches connected to base
    const leaves = findLeaves(this.#schema, base)
      .filter((branch) => this.#schema[branch].type !== 'regex');

    await Promise.all(leaves.map(async (branch) => {
    // for (const branch of leaves) {
      // get value of branch
      const branchValue = await this.#buildBranchValue(base, baseUUID, branch);

      if (branchValue !== undefined) {
        if (this.#schema[base].type === 'array') {
          entry.items.push(branchValue);

          entry.items = entry.items.flat();
        } else {
          // assign value to entry
          entry[branch] = branchValue;
        }
      }
    }));

    return entry;
  }

  /**
   * This returns a value of the branch above base.
   * @name buildBranchValue
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @param {string} branch - Branch name.
   * @returns {object|object[]} - Value or array of values.
   */
  async #buildBranchValue(base, baseUUID, branch) {
    const { trunk: baseTrunk } = this.#schema[base];

    // if searchParams already has value, return it immediately
    // skip if branch belongs to an array item because those branch values can vary
    if (this.#searchParams.has(branch) && this.#schema[baseTrunk]?.type !== 'array') {
      return this.#searchParams.get(branch);
    }

    // get the branch UUID related to the base UUID
    const branchUUID = await this.#findBranchUUID(base, baseUUID, branch);

    if (branchUUID === undefined) {
      return undefined;
    }

    if (Array.isArray(branchUUID)) {
      const branchValues = [];

      await Promise.all(branchUUID.map(async (uuid) => {
        // get value of branch
        const branchValue = await this.#findBranchValue(branch, uuid);

        branchValues.push(branchValue);
      }));

      return branchValues;
    }

    // get value of branch
    const branchValue = await this.#findBranchValue(branch, branchUUID);

    return branchValue;
  }

  /**
   * This returns the branch UUID related to the base UUID.
   * @name findBranchUUID
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @param {string} branch - Branch name.
   * @returns {string|string[]} - Branch UUID(s).
   */
  async #findBranchUUID(base, baseUUID, branch) {
    const { trunk } = this.#schema[branch];

    const trunkUUID = trunk === base
      ? baseUUID
      : await this.#findBranchUUID(base, baseUUID, trunk);

    const pairLines = await this.#grep(
      this.#store[`metadir/pairs/${trunk}-${branch}.csv`],
      `^${trunkUUID},`,
    );

    if (pairLines === '') {
      return undefined;
    }

    if (this.#schema[base].type === 'array') {
      const branchUUIDs = takeValues(pairLines);

      return branchUUIDs;
    }

    const branchUUID = takeValue(pairLines);

    return branchUUID;
  }

  /**
   * This returns the value related to branchUUID.
   * @name findBranchValue
   * @function
   * @param {string} branch - Branch name.
   * @param {string} branchUUID - Branch UUID.
   * @returns {object} - Branch value.
   */
  async #findBranchValue(branch, branchUUID) {
    switch (this.#schema[branch].type) {
      case 'array':
        return this.#buildEntry(branch, branchUUID);

      case 'object':
        return this.#buildEntry(branch, branchUUID);

      case 'hash':
        return branchUUID;

      case 'string': {
        const branchLine = await this.#grep(
          this.#store[`metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`],
          `^${branchUUID}`,
        );

        if (branchLine !== '') {
          const branchValue = JSON.parse(takeValue(branchLine));

          return branchValue;
        }

        return undefined;
      }

      default: {
        const branchLine = await this.#grep(
          this.#store[`metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`],
          `^${branchUUID}`,
        );

        if (branchLine !== '') {
          const branchValue = takeValue(branchLine);

          return branchValue;
        }

        return undefined;
      }
    }
  }
}
