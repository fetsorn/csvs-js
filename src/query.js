import { grepPolyfill, randomUUIDPolyfill } from './polyfill';
import {
  tbn8, tbn9, tbn12, tbn16, tbn20, takeUUIDs, takeValue, splitLines, takeValues,
} from './tbn';

/**
 * This callback reads db.
 * @callback readFileCallback
 * @param {string} path - The file path.
 * @returns {string} - The file contents
 */

/**
 * This callback writes db.
 * @callback writeFileCallback
 * @param {string} path - The file path.
 * @param {string} contents - The file contents.
 */

/**
 * This callback searches files.
 * @callback grepCallback
 * @param {string} contents - The file contents.
 * @param {string} regex - The regular expression in ripgrep format.
 * @returns {string} - The search results
 */

/**
 * This callback returns a UUID.
 * @callback randomUUIDCallback
 * @returns {string} - UUID compliant with RFC 4122
 */

/** Class representing a database search. */
export default class Query {
  /**
   * readFile is the callback that reads db.
   * @type {readFileCallback}
   */
  #readFile;

  /**
   * writeFile is the callback that writes db.
   * @type {writeFileCallback}
   */
  #writeFile;

  /**
   * grep is the callback that searches files.
   * @type {grepCallback}
   */
  #grep;

  /**
   * randomUUID is the callback that returns a UUID.
   * @type {randomUUIDCallback}
   */
  #randomUUID;

  /**
   * schmea is the database schema.
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
    this.#schema = await this.#tbn10();

    this.#searchParams = this.#searchParams ?? new URLSearchParams();

    // if no base is provided, find schema root
    this.#base = this.#base ?? tbn9(this.#schema);

    this.#store = await this.#tbn5(this.#base);

    console.log(this.#store);

    const baseUUIDs = await this.#tbn6(this.#base);

    const tbn4 = await this.#tbn7(this.#base, baseUUIDs);

    return tbn4;
  }

  async #tbn10() {
    return JSON.parse(await this.#readFile('metadir.json'));
  }

  /**
   * This returns a map of database file contents.
   * @name tbn5
   * @function
   * @param {string} base - Base branch.
   * @returns {Map} - Map of file paths to file contents.
   */
  async #tbn5(base) {
    // get array of all filepaths required to search for base branch
    const filePaths = tbn8(this.#schema, base);

    const store = {};

    await Promise.all(filePaths.map(async (filePath) => {
      store[filePath] = (await this.#readFile(filePath)) ?? '\n';
    }));

    return store;
  }

  /**
   * This returns an array of base UUIDs.
   * @name tbn6
   * @function
   * @param {string} base - Base branch.
   * @returns {string[]} - Array of base UUIDs.
   */
  async #tbn6(base) {
    // TODO: add support for all branches
    // only works if searchParams are for direct leaves of base
    // get all search actions required by searchParams
    const tbn11 = tbn12(this.#searchParams, base, this.#schema, this.#store);

    // get array of all UUIDs of the base branch
    let baseUUIDs = tbn16(this.#store, this.#schema, base);

    // grep against every search result until reaching a common set of UUIDs
    await Promise.all(tbn11.map(async (tbn13) => {
      const tbn14 = this.#store[tbn13.indexPath];

      const tbn15 = await this.#grep(tbn14, tbn13.regex);

      const tbn33 = takeUUIDs(tbn15);

      const tbn31 = await this.#grep(
        this.#store[`metadir/pairs/${base}-${tbn13.branch}.csv`],
        tbn33.join('\n'),
      );

      const tbn32 = takeUUIDs(tbn31);

      const tbn34 = await this.#grep(baseUUIDs.join('\n'), tbn32.join('\n'));

      baseUUIDs = splitLines(tbn34);
    }));

    return baseUUIDs;
  }

  /**
   * This returns an array of entries.
   * @name tbn7
   * @function
   * @param {string} base - Base branch.
   * @param {string[]} baseUUIDs - Array of base UUIDs.
   * @returns {object[]} - Array of entries.
   */
  async #tbn7(base, baseUUIDs) {
    const tbn4 = [];

    await Promise.all(baseUUIDs.map(async (baseUUID) => {
      tbn4.push(await this.#tbn18(base, baseUUID));
    }));

    return tbn4;
  }

  /**
   * This returns an entry.
   * @name tbn18
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @returns {object} - Entry.
   */
  async #tbn18(base, baseUUID) {
    console.log(18, base, baseUUID);
    const tbn24 = { UUID: baseUUID };

    switch (this.#schema[base].type) {
      case 'object':
        tbn24.item_name = base;
        break;

      case 'array':
        tbn24.items = [];
        break;

      default:
        tbn24[base] = await this.#tbn30(base, baseUUID);
    }

    // init front of the queue with an array of branches above base
    let tbn19 = tbn20(base, this.#schema);

    // maximum attempts to process branches
    const DEPTH = 5;

    let depth = 0;

    // map of branch to UUID
    const tbn28 = new Map();

    tbn28.set(base, true);

    while (depth < DEPTH || tbn19.length > 0) {
      // init rear of the queue with empty list
      const tbn21 = [];

      // await Promise.all(tbn19.map(async (branch) => {
      for (const branch of tbn19) {
        console.log('18-branch', branch);

        const { trunk } = this.#schema[branch];

        // if trunk has not been processed, return undefined to repeat again later
        if (!tbn28.get(trunk)) {
          // enqueue another processing of branch
          tbn21.push(branch);
        } else {
          // set branch as processed
          tbn28.set(branch, true);

          // get value of branch
          const tbn25 = await this.#tbn23(base, baseUUID, tbn28, branch);

          if (tbn25 !== undefined) {
            if (this.#schema[base].type === 'array') {
              tbn24.items.push(tbn25);

              tbn24.items = tbn24.items.flat();
            } else {
              // assign value to entry
              tbn24[branch] = tbn25;
            }
          }
        }
      }

      tbn19 = [...tbn21];

      depth += 1;
    }

    return tbn24;
  }

  /**
   * This returns a value of the branch above base.
   * @name tbn23
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - base UUID.
   * @param {object} tbn28 - Map of processed branches.
   * @param {string} branch - Branch name.
   * @returns {object} - Entry.
   */
  async #tbn23(base, baseUUID, tbn28, branch) {
    console.log(23, base, baseUUID, tbn28, branch);

    const { trunk: baseTrunk } = this.#schema[base];

    // if searchParams already has value, return it immediately
    // skip if branch belongs to an array item because those branch values can vary
    if (this.#searchParams.has(branch) && this.#schema[baseTrunk]?.type !== 'array') {
      return this.#searchParams.get(branch);
    }

    // get the branch UUID related to the base UUID
    const branchUUID = await this.#tbn27(base, baseUUID, branch);

    console.log('23-27', branch, branchUUID);

    if (branchUUID === undefined) {
      return undefined;
    }

    if (Array.isArray(branchUUID)) {
      const branchValues = [];

      await Promise.all(branchUUID.map(async (uuid) => {
        // get value of branch
        const branchValue = await this.#tbn30(branch, uuid);

        branchValues.push(branchValue);
      }));

      console.log('23-30', branch, branchUUID, branchValues);

      return branchValues;
    }

    // get value of branch
    const branchValue = await this.#tbn30(branch, branchUUID);

    console.log('23-30', branch, branchUUID, branchValue);

    return branchValue;
  }

  /**
   * This returns the branch UUID related to the base UUID.
   * @name tbn27
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @param {string} branch - Branch name.
   * @returns {string|string[]} - Branch UUID(s).
   */
  async #tbn27(base, baseUUID, branch) {
    console.log(27, base, baseUUID, branch);
    const { trunk } = this.#schema[branch];

    const trunkUUID = trunk === base
      ? baseUUID
      : await this.#tbn27(base, baseUUID, trunk);

    const tbn35 = await this.#grep(
      this.#store[`metadir/pairs/${trunk}-${branch}.csv`],
      `^${trunkUUID},`,
    );

    if (tbn35 !== '') {
      if (this.#schema[base].type === 'array') {
        const tbn36 = takeValues(tbn35);

        console.log('27-35', base, branch, tbn36);

        return tbn36;
      }

      const tbn36 = takeValue(tbn35);

      console.log('27-35', base, branch, tbn36);

      return tbn36;
    }

    console.log('27-fail', `metadir/pairs/${trunk}-${branch}.csv`, `^${trunkUUID},`, this.#store[`metadir/pairs/${trunk}-${branch}.csv`]);

    return undefined;
  }

  /**
   * This returns the value related to branchUUID.
   * @name tbn27
   * @function
   * @param {string} branch - Branch name.
   * @param {string} branchUUID - Branch UUID.
   * @returns {object} - Branch value.
   */
  async #tbn30(branch, branchUUID) {
    console.log(30, branch, branchUUID);
    switch (this.#schema[branch].type) {
      case 'array':
        return this.#tbn18(branch, branchUUID);

      case 'object':
        return this.#tbn18(branch, branchUUID);

      case 'hash':
        return branchUUID;

      case 'string': {
        const tbn37 = await this.#grep(
          this.#store[`metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`],
          `^${branchUUID}`,
        );

        if (tbn37 !== '') {
          const tbn38 = JSON.parse(takeValue(tbn37));

          return tbn38;
        }

        return undefined;
      }

      default: {
        console.log('30-default', `metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`, `^${branchUUID}`);
        const tbn37 = await this.#grep(
          this.#store[`metadir/props/${this.#schema[branch].dir ?? branch}/index.csv`],
          `^${branchUUID}`,
        );

        if (tbn37 !== '') {
          const tbn38 = takeValue(tbn37);

          return tbn38;
        }

        return undefined;
      }
    }
  }
}
