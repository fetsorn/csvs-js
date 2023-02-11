import { grepPolyfill, randomUUIDPolyfill } from './polyfill';
import { findCrownPaths } from './schema';

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

  async update() {
    this.#schema = await this.#readSchema();

    // get a map of database file contents
    this.#store = await this.#readStore(this.#entry['|']);

    const { value } = await this.#save(this.#entry);

    await this.#writeStore();

    return value;
  }

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
    if (branchType !== 'hash' && branchType !== 'object' && branchType !== 'array') {
      const indexPath = `metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`;

      const indexFile = this.#tbn1[indexPath] ?? this.#store[indexPath];

      const branchValueEscaped = this.#schema[branch].type === 'string'
        ? JSON.stringify(branchValue)
        : branchValue;

      const indexLine = `${branchUUID},${branchValueEscaped}\n`;

      if (indexFile === '\n') {
        this.#tbn1[indexPath] = indexLine;
      } else if (!indexFile.includes(indexLine)) {
        const indexPruned = await this.#grep(indexFile, branchUUID, true);

        this.#tbn1[indexPath] = indexPruned + indexLine;
      }
    }

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

          await Promise.all(leafItems.map(async (item) => {
          // for (const item of leafItems) {
            await this.#link(branchUUID, item);
          }));
        } else {
          const leafEntry = this.#schema[leaf].type === 'array'
            ? entry[leaf]
            : Object.keys(entry)
              .filter((b) => this.#schema[b]?.trunk === leaf)
              .reduce((acc, key) => ({ [key]: entry[key], ...acc }), { '|': leaf, [leaf]: entry[leaf] });

          await this.#link(branchUUID, leafEntry);
        }
      } else {
        /// unlink if not in the entry
        await this.#unlink(branchUUID, leaf);
      }
    }));

    return { UUID: branchUUID, ...branchValue };
  }

  async #link(trunkUUID, entry) {
    const branch = entry['|'];

    const { trunk } = this.#schema[branch];
    // save if needed
    const { UUID: branchUUID } = await this.#save(entry);

    // add to pairs
    const pairLine = `${trunkUUID},${branchUUID}\n`;

    const pairPath = `metadir/pairs/${trunk}-${branch}.csv`;

    const pairFile = this.#tbn1[pairPath] ?? this.#store[pairPath];

    if (pairFile === '\n') {
      this.#tbn1[pairPath] = pairLine;
    } else if (!pairFile.includes(pairLine)) {
      if (this.#schema[trunk].type === 'array') {
        this.#tbn1[pairPath] = pairFile + pairLine;
      } else {
        const pairPruned = await this.#grep(pairFile, trunkUUID, true);

        this.#tbn1[pairPath] = pairPruned + pairLine;
      }
    }
  }

  // remove from pairs
  async #unlink(trunkUUID, branch) {
    // prune pairs file for trunk UUID
    const pairPath = `metadir/pairs/${this.#schema[branch].trunk}-${branch}.csv`;

    // if file, prune it for trunk UUID
    const pairFile = this.#store[pairPath];

    if (pairFile !== '\n') {
      const pairPruned = await this.#grep(pairFile, trunkUUID, true);

      this.#tbn1[pairPath] = pairPruned;
    }
  }

  async delete() {
    this.#schema = await this.#readSchema();

    // get a map of database file contents
    this.#store = await this.#readStore(this.#entry['|']);
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
    await Promise.all(Object.entries(this.#tbn1).map(async ([filePath, contents]) => {
      await this.#writeFile(filePath, contents);
    }));
  }
}
