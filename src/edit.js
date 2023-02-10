import { grepPolyfill, randomUUIDPolyfill } from './polyfill';

/**
 * This generates a SHA-256 hashsum.
 * @name digestMessage
 * @function
 * @param {string} message - A string.
 * @returns {string} - SHA-256 hashsum.
 */
export async function digestMessage(message) {
  // encode as (utf-8) Uint8Array
  const msgUint8 = new TextEncoder().encode(message);

  // hash as buffer
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

  // convert buffer to byte array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
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
 * This finds the root branch of a database schema.
 * @name findSchemaRoot
 * @function
 * @param {object} schema - Database schema.
 * @returns {string} - Root branch.
 */
function findSchemaRoot(schema) {
  return Object.keys(schema).find((branch) => !Object.prototype.hasOwnProperty.call(schema[branch], 'trunk'));
}

/** Class representing a database entry. */
export default class Entry {
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
   * base is the branch to search for.
   * @type {URLSearchParams}
   */
  #base;

  /**
   * Database entry.
   * @type {object}
   */
  #entry;

  /**
   * store is the map of file paths to file contents read before.
   * @type {URLSearchParams}
   */
  #store;

  /**
   * tbn is the map of file paths to file contents to write.
   * @type {URLSearchParams}
   */
  #tbn1 = {};

  /**
   * Create a database instance.
   * @param {Object} args - Object with callbacks.
   * @param {readFileCallback} args.readFile - The callback that reads db.
   * @param {writeFileCallback} args.writeFile - The callback that writes db.
   * @param {grepCallback} args.grep - The callback that searches files.
   * @param {randomUUIDCallback} args.randomUUID - The callback that returns a UUID.
   * @param {string} args.base - The field to search for.
   * @param {object} args.entry - A database entry.
   */
  constructor({
    readFile, writeFile, grep, randomUUID, entry, base,
  }) {
    this.#entry = entry;
    this.#base = base;
    this.#readFile = readFile;
    this.#writeFile = writeFile;
    this.#grep = grep ?? grepPolyfill;
    this.#randomUUID = randomUUID ?? crypto.randomUUID ?? randomUUIDPolyfill;
  }

  async update() {
    this.#schema = await this.#readSchema();

    // if no base is provided, find schema root
    this.#base = this.#base ?? findSchemaRoot(this.#schema);

    // get a map of database file contents
    this.#store = await this.#readStore(this.#base);

    if (!this.#entry.UUID) {
      const random = this.#randomUUID ?? crypto.randomUUID;

      const entryUUID = await digestMessage(random());

      this.#entry.UUID = entryUUID;
    }

    const uuids = {};

    uuids[this.#base] = this.#entry.UUID;

    const queue = [...Object.keys(this.#schema)];

    const processed = new Map();

    for (const branch of queue) {
      console.log('update-branch', branch);
      const branchType = this.#schema[branch].type;

      const { trunk } = this.#schema[branch];

      if (!processed.get(trunk) && branch !== this.#base) {
        queue.push(branch);
      } else {
        processed.set(branch, true);

        if (!Object.keys(this.#entry).includes(branch)) {
          console.log('update-remove');
          if (this.#schema[branch].trunk === this.#base) {
          // prune pairs file for trunk UUID
            const trunkUUID = uuids[trunk];

            const pairPath = `metadir/pairs/${this.#base}-${branch}.csv`;

            console.log(pairPath, this.#store[pairPath]);

            // if file, prune it for trunk UUID
            const pairFile = this.#store[pairPath];

            if (pairFile !== '\n') {
              const pairPruned = await this.#grep(pairFile, trunkUUID, true);

              this.#tbn1[pairPath] = pairPruned;
            }
          } else {
          // do nothing
          }
        } else {
          console.log('update-edit');
          let branchUUID;

          let branchValue = JSON.parse(JSON.stringify(
            this.#entry[branch],
          ));

          if (branch !== this.#base) {
            branchUUID = await digestMessage(branchValue);
          } else {
            branchUUID = this.#entry.UUID;
          }

          uuids[branch] = branchUUID;

          if (branchType !== 'hash') {
            const indexPath = `metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`;

            const indexFile = this.#tbn1[indexPath] ?? this.#store[indexPath];

            if (branchType === 'string') {
              branchValue = JSON.stringify(branchValue);
            }

            const indexLine = `${branchUUID},${branchValue}\n`;

            if (indexFile === '\n') {
              this.#tbn1[indexPath] = indexLine;
            } else if (!indexFile.includes(indexLine)) {
              const indexPruned = await this.#grep(indexFile, branchUUID, true);

              this.#tbn1[indexPath] = indexPruned + indexLine;
            }
          }

          if (branch !== this.#base) {
            const trunkUUID = uuids[trunk];

            const pairLine = `${trunkUUID},${branchUUID}\n`;

            const pairPath = `metadir/pairs/${trunk}-${branch}.csv`;

            const pairFile = this.#tbn1[pairPath] ?? this.#store[pairPath];

            if (pairFile === '\n') {
              this.#tbn1[pairPath] = pairLine;
            } else if (!pairFile.includes(pairLine)) {
              const pairPruned = await this.#grep(pairFile, trunkUUID, true);

              this.#tbn1[pairPath] = pairPruned + pairLine;
            }
          }
        }
      }
    }

    await this.#writeStore();

    return this.#entry;
  }

  async delete() {
    this.#schema = await this.#readSchema();

    // if no base is provided, find schema root
    this.#base = this.#base ?? findSchemaRoot(this.#schema);

    // get a map of database file contents
    this.#store = await this.#readStore(this.#base);
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

    console.log('readStore', store);

    return store;
  }

  /**
   * This returns a map of database file contents.
   * @name writeStore
   * @function
   */
  async #writeStore() {
    console.log('writeStore', this.#tbn1);
    await Promise.all(Object.entries(this.#tbn1).map(async ([filePath, contents]) => {
      await this.#writeFile(filePath, contents);
    }));
  }
}
