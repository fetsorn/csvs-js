/* eslint-disable import/extensions */
import { grepPolyfill, randomUUIDPolyfill } from './polyfill.js';
import { findCrownPaths } from './schema.js';
import { takeUUIDs } from './metadir.js';

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
   * Database entry.
   * @type {object}
   */
  #entry;

  /**
   * store is the map of file paths to file contents read at start.
   * @type {URLSearchParams}
   */
  #store;

  /**
   * output is the map of file paths to file contents to write.
   * @type {URLSearchParams}
   */
  #output = {};

  /**
   * Create a database instance.
   * @param {Object} args - Object with callbacks.
   * @param {readFileCallback} args.readFile - The callback that reads db.
   * @param {writeFileCallback} args.writeFile - The callback that writes db.
   * @param {grepCallback} args.grep - The callback that searches files.
   * @param {randomUUIDCallback} args.randomUUID - The callback that returns a UUID.
   * @param {object} args.entry - A database entry.
   */
  constructor({
    readFile, writeFile, grep, randomUUID, entry,
  }) {
    this.#entry = entry;
    this.#readFile = readFile;
    this.#writeFile = writeFile;
    this.#grep = grep ?? grepPolyfill;
    this.#randomUUID = randomUUID ?? crypto.randomUUID ?? randomUUIDPolyfill;
  }

  /**
   * This updates the database entry.
   * @name update
   * @function
   * @returns {object} - A database entry.
   */
  async update() {
    this.#schema = await this.#readSchema();

    this.#store = await this.#readStore(this.#entry['|']);

    const { value } = await this.#save(this.#entry);

    await this.#writeStore();

    return value;
  }

  /**
   * This deletes the database entry.
   * @name delete
   * @function
   */
  async delete() {
    this.#schema = await this.#readSchema();

    this.#store = await this.#readStore(this.#entry['|']);

    const branchUUID = await this.#remove(this.#entry);

    await this.#unlinkTrunks(this.#entry['|'], this.#entry.UUID ?? branchUUID);

    await this.#unlinkLeaves(this.#entry['|'], this.#entry.UUID ?? branchUUID);

    await this.#writeStore();
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
    const filePaths = findCrownPaths(this.#schema, base);

    const store = {};

    await Promise.all(filePaths.map(async (filePath) => {
      store[filePath] = (await this.#readFile(filePath)) ?? '\n';
    }));

    return store;
  }

  /**
   * This returns a map of database file contents.
   * @name writeStore
   * @function
   */
  async #writeStore() {
    await Promise.all(Object.entries(this.#output).map(async ([filePath, contents]) => {
      await this.#writeFile(filePath, contents);
    }));
  }

  /**
   * This saves an entry to the database.
   * @name save
   * @param {object} entry - A database entry.
   * @function
   * @returns {object} - A database entry with new UUID.
   */
  async #save(entry) {
    const branch = entry['|'];

    const branchType = this.#schema[branch].type;

    const branchValue = branchType === 'array' || branchType === 'object'
      ? entry
      : entry[branch];

    let branchUUID;

    if (entry.UUID) {
      branchUUID = entry.UUID;
    } else if (this.#schema[branch].trunk === undefined
               || branchType === 'array'
               || branchType === 'object') {
      branchUUID = await digestMessage(await this.#randomUUID());
    } else {
      branchUUID = await digestMessage(branchValue);
    }

    // add to props if needed
    const indexPath = `metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`;

    const indexFile = this.#output[indexPath] ?? this.#store[indexPath];

    const branchValueEscaped = this.#schema[branch].type === 'string'
      ? JSON.stringify(branchValue)
      : branchValue;

    const isUUID = branchType === 'hash' || branchType === 'object' || branchType === 'array';

    const indexLine = isUUID ? `${branchUUID}\n` : `${branchUUID},${branchValueEscaped}\n`;

    if (indexFile === '\n') {
      this.#output[indexPath] = indexLine;
    } else if (!indexFile.includes(indexLine)) {
      const indexPruned = await this.#grep(indexFile, branchUUID, true);

      this.#output[indexPath] = indexPruned + indexLine;
    }

    await this.#linkLeaves(entry, branchUUID);

    return { UUID: branchUUID, ...branchValue };
  }

  /**
   * This removes an entry from the database.
   * @name remove
   * @param {object} entry - A database entry.
   * @function
   */
  async #remove(entry) {
    const branch = entry['|'];

    const branchType = this.#schema[branch].type;

    if (branchType === 'hash'
        || branchType === 'object'
        || branchType === 'array') {
      if (entry.UUID === undefined) {
        throw Error(`failed to remove ${branchType} branch ${branch} entry without UUID`);
      }
      return undefined;
    }

    const branchValue = entry[branch];

    let branchUUID;

    if (entry.UUID) {
      branchUUID = entry.UUID;
    } else if (this.#schema[branch].trunk === undefined) {
      throw Error(`failed to remove root branch ${branch} entry without UUID`);
    } else {
      branchUUID = await digestMessage(branchValue);
    }

    // prune props if exist
    const indexPath = `metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`;

    const indexFile = this.#output[indexPath] ?? this.#store[indexPath];

    const indexPruned = await this.#grep(indexFile, branchUUID, true);

    this.#output[indexPath] = indexPruned;

    return branchUUID;
  }

  /**
   * This links all leaves to the branch.
   * @name linkLeaves
   * @param {object} entry - A database entry.
   * @param {object} branchUUID - The branch UUID.
   * @function
   */
  async #linkLeaves(entry, branchUUID) {
    const branch = entry['|'];

    const branchType = this.#schema[branch].type;

    const leaves = Object.keys(this.#schema)
      .filter((b) => this.#schema[b].trunk === branch
              && this.#schema[b].type !== 'regex');

    // map leaves
    await Promise.all(leaves.map(async (leaf) => {
    // for (const leaf of leaves) {
      const entryLeaves = branchType === 'array'
        ? entry.items.map((item) => item['|'])
        : Object.keys(entry);

      if (entryLeaves.includes(leaf)) {
        // link if in the entry
        if (this.#schema[branch].type === 'array') {
          const leafItems = entry.items.filter((item) => item['|'] === leaf);

          // unlink all items from branch for refresh
          await this.#unlinkLeaves(branch, branchUUID);

          await Promise.all(leafItems.map(async (item) => {
            // for (const item of leafItems) {
            await this.#linkTrunk(branchUUID, item);
          }));
        } else {
          const leafEntry = this.#schema[leaf].type === 'array'
            ? entry[leaf]
            : Object.keys(entry)
              .filter((b) => this.#schema[b]?.trunk === leaf)
              .reduce((acc, key) => ({ [key]: entry[key], ...acc }), { '|': leaf, [leaf]: entry[leaf] });

          await this.#linkTrunk(branchUUID, leafEntry);
        }
      } else {
        /// unlink if not in the entry
        await this.#unlinkTrunk(branchUUID, leaf);
      }
    }));
  }

  /**
   * This links an entry to a trunk UUID.
   * @name linkTrunk
   * @param {object} trunkUUID - The trunk UUID.
   * @param {object} entry - A database entry.
   * @function
   */
  async #linkTrunk(trunkUUID, entry) {
    const branch = entry['|'];

    const { trunk } = this.#schema[branch];
    // save if needed
    const { UUID: branchUUID } = await this.#save(entry);

    // add to pairs
    const pairLine = `${trunkUUID},${branchUUID}\n`;

    const pairPath = `metadir/pairs/${trunk}-${branch}.csv`;

    const pairFile = this.#output[pairPath] ?? this.#store[pairPath];

    if (pairFile === '\n') {
      this.#output[pairPath] = pairLine;
    } else if (!pairFile.includes(pairLine)) {
      if (this.#schema[trunk].type === 'array') {
        this.#output[pairPath] = pairFile + pairLine;
      } else {
        const pairPruned = await this.#grep(pairFile, trunkUUID, true);

        this.#output[pairPath] = pairPruned + pairLine;
      }
    }
  }

  /**
   * This unlinks an entry from a trunk UUID.
   * @name unlinkTrunk
   * @param {object} trunkUUID - The trunk UUID.
   * @param {object} entry - A database entry.
   * @function
   */
  async #unlinkTrunk(trunkUUID, branch) {
    // prune pairs file for trunk UUID
    const pairPath = `metadir/pairs/${this.#schema[branch].trunk}-${branch}.csv`;

    // if file, prune it for trunk UUID
    const pairFile = this.#store[pairPath];

    if (pairFile !== '\n') {
      const pairPruned = await this.#grep(pairFile, trunkUUID, true);

      this.#output[pairPath] = pairPruned;
    }
  }

  /**
   * This unlinks a branch UUID from all trunk UUIDs.
   * @name unlinkTrunks
   * @param {string} branch - A branch name.
   * @param {string} branchUUID - A branch UUID.
   * @function
   */
  async #unlinkTrunks(branch, branchUUID) {
    const { trunk } = this.#schema[branch];

    // unlink trunk if it exists
    if (trunk !== undefined) {
      // find trunkUUIDs
      const trunkLines = await this.#grep(
        `metadir/pairs/${trunk}-${branch}.csv`,
        `,${branchUUID}$`,
      );

      const trunkUUIDs = takeUUIDs(trunkLines);

      // unlink trunk
      await Promise.all(trunkUUIDs.map(async (trunkUUID) => {
        await this.#unlinkTrunk(trunkUUID, branch);
      }));
    }
  }

  /**
   * This unlinks a branch UUID from all leaf UUIDs.
   * @name unlinkLeaves
   * @param {string} branch - A branch name.
   * @param {string} branchUUID - A branch UUID.
   * @function
   */
  async #unlinkLeaves(branch, branchUUID) {
    // find all leaves
    const leaves = Object.keys(this.#schema)
      .filter((b) => this.#schema[b].trunk === branch
              && this.#schema[b].type !== 'regex');

    await Promise.all(leaves.map(async (leaf) => {
      await this.#unlinkTrunk(branchUUID, leaf);
    }));
  }
}
