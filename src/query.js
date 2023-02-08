import { grepPolyfill, randomUUIDPolyfill } from './polyfill';
import {
  tbn8, tbn9, tbn12, tbn16, tbn20,
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

/** Class representing a database. */
export default class Tbn0 {
  /**
   * Create a database instance.
   * @param {Object} args - Object with callbacks.
   * @param {readFileCallback} args.readFile - The callback that reads db.
   * @param {writeFileCallback} args.writeFile - The callback that writes db.
   * @param {grepCallback} args.grep - The callback searches files.
   * @param {randomUUIDCallback} args.randomUUID - The callback that returns a UUID.
   */
  constructor({
    readFile, writeFile, grep, random,
  }) {
    this.readFile = readFile;
    this.writeFile = writeFile;
    this.grep = grep ?? grepPolyfill;
    this.random = random ?? crypto.randomUUID ?? randomUUIDPolyfill;
  }

  /**
   * This returns an array of entries from the database.
   * @name tbn1
   * @function
   * @param {Object} args - Object with search arguments.
   * @param {URLSearchParams} args.searchParams - The search parameters.
   * @param {string} args.stump - The field to search for.
   * @returns {Object[]}
   */
  async tbn1(args) {
    const schema = await this.tbn10();

    const searchParams = args.searchParams ?? new URLSearchParams();

    const stump = args.stump ?? tbn9(schema);

    const tbn2 = await this.tbn5(searchParams, stump, schema);

    const tbn3 = await this.tbn6(searchParams, stump, schema, tbn2);

    const tbn4 = await this.tbn7(searchParams, stump, schema, tbn2, tbn3);

    return tbn4;
  }

  async #tbn10() {
    return JSON.parse(await this.readFile('metadir.json'));
  }

  /**
   * This returns a map of database file contents.
   * @name tbn5
   * @function
   * @param {URLSearchParams} searchParams - The search parameters.
   * @param {string} stump - The field to search for.
   * @param {object} schema - The database schema.
   * @returns {Map} - Map of file paths to file contents.
   */
  async #tbn5(searchParams, stump, schema) {
    // get array of all filepaths required to search for stump
    const filePaths = tbn8(schema, stump);

    const tbn2 = new Map();

    Promise.all(filePaths.map(async (filePath) => {
      tbn2.set(filePath, await this.readFile(filePath));
    }));

    return tbn2;
  }

  /**
   * This returns an array of stump UUIDs.
   * @name tbn6
   * @function
   * @param {URLSearchParams} searchParams - The search parameters.
   * @param {string} stump - The field to search for.
   * @param {object} schema - The database schema.
   * @param {Map} tbn2 - Map of file paths to file contents.
   * @returns {string[]} - Array of stump UUIDs.
   */
  async #tbn6(searchParams, stump, schema, tbn2) {
    // get all search actions required by searchParams
    const tbn11 = tbn12(searchParams, stump, schema, tbn2);

    // get array of all UUIDs of the stump
    let tbn3 = tbn16(tbn2, schema, stump);

    // grep against every search result until reaching a common set of UUIDs
    Promise.all(tbn11.map(async (tbn13) => {
      const tbn14 = tbn2[tbn13.indexPath];

      const tbn15 = await this.grep(tbn14, tbn13.regex);

      tbn3 = await this.grep(tbn3.join('\n'), tbn15.join('\n'));
    }));

    return tbn3;
  }

  /**
   * This returns an array of entries.
   * @name tbn7
   * @function
   * @param {URLSearchParams} searchParams - The search parameters.
   * @param {string} stump - The field to search for.
   * @param {object} schema - The database schema.
   * @param {Map} tbn2 - Map of file paths to file contents.
   * @param {string[]} tbn3 - Array of stump UUIDs.
   * @returns {object[]} - Array of entries.
   */
  async #tbn7(searchParams, stump, schema, tbn2, tbn3) {
    const tbn4 = [];

    Promise.all(tbn3.map(async (stumpUUID) => {
      tbn4.push(await this.tbn18(searchParams, stump, schema, tbn2, stumpUUID));
    }));

    return tbn4;
  }

  /**
   * This returns an entry.
   * @name tbn18
   * @function
   * @param {URLSearchParams} searchParams - The search parameters.
   * @param {string} stump - The field to search for.
   * @param {object} schema - The database schema.
   * @param {Map} tbn2 - Map of file paths to file contents.
   * @param {string} stumpUUID - Stump UUID.
   * @returns {object} - Entry.
   */
  async #tbn18(searchParams, stump, schema, tbn2, stumpUUID) {
    const tbn24 = { UUID: stumpUUID };

    // init front of the queue with an array of branches above stump
    let tbn19 = tbn20(stump, schema);

    // maximum attempts to process branches
    const DEPTH = 5;

    let depth = 0;

    // map of branch to UUID
    const tbn28 = new Map();

    while (depth < DEPTH || tbn19.length > 0) {
      // init rear of the queue with empty list
      const tbn21 = [];

      Promise.all(tbn19.map(async (tbn22) => {
        // get value of branch
        const tbn25 = await this.tbn23(searchParams, stump, schema, tbn2, stumpUUID, tbn28, tbn22);

        if (tbn25 !== undefined) {
          // set branch as processed
          tbn28.set(tbn22, true);

          // assign value to entry
          tbn24[tbn22] = tbn25;
        } else {
          // enqueue another of branch
          tbn21.push(tbn22);
        }
      }));

      tbn19 = [...tbn21];

      depth += 1;
    }

    return tbn24;
  }

  /**
   * This returns a value of the branch above stump.
   * @name tbn23
   * @function
   * @param {URLSearchParams} searchParams - The search parameters.
   * @param {string} stump - The field to search for.
   * @param {object} schema - The database schema.
   * @param {Map} tbn2 - Map of file paths to file contents.
   * @param {string} stumpUUID - Stump UUID.
   * @param {object} tbn28 - Map of processed branches.
   * @param {string} branch - Branch name.
   * @returns {object} - Entry.
   */
  async #tbn23(searchParams, stump, schema, tbn2, stumpUUID, tbn28, branch) {
    // if searchParams already has value, return it
    if (searchParams.has(branch)) {
      return searchParams.get(branch);
    }

    const { trunk } = schema[branch];

    // if trunk has not been processed, return undefined to repeat again later
    if (!tbn28.get(trunk)) {
      return undefined;
    }

    // get the branch UUID related to the stomp UUID
    const branchUUID = await this.tbn27(stump, schema, tbn2, stumpUUID, branch);

    // get value of branch
    const tbn29 = await this.tbn30(schema, tbn2, branch, branchUUID);

    return tbn29;
  }

  /**
   * This returns the branch UUID related to stomp UUID.
   * @name tbn27
   * @function
   * @param {string} stump - The field to search for.
   * @param {object} schema - The database schema.
   * @param {Map} tbn2 - Map of file paths to file contents.
   * @param {string} stumpUUID - Stump UUID.
   * @param {string} branch - Branch name.
   * @returns {string} - Branch UUID.
   */
  async #tbn27(stump, schema, tbn2, stumpUUID, branch) {
    const { trunk } = schema[branch];

    const trunkUUID = trunk === stump
      ? stumpUUID
      : await this.tbn27(stump, schema, tbn2, stumpUUID, trunk);

    return this.grep(tbn2[`metadir/pairs/${trunk}-${branch}.csv`], `^${trunkUUID}$\n`);
  }

  /**
   * This returns the value related to branchUUID.
   * @name tbn27
   * @function
   * @param {object} schema - The database schema.
   * @param {Map} tbn2 - Map of file paths to file contents.
   * @param {string} branch - Branch name.
   * @param {string} branchUUID - Branch UUID.
   * @returns {object} - Branch value.
   */
  async #tbn30(schema, tbn2, branch, branchUUID) {
    switch (schema[branch].type) {
      case 'array':
        return this.tbn18({}, branch, schema, tbn2, branchUUID);

      case 'object':
        return this.tbn18({}, branch, schema, tbn2, branchUUID);

      case 'string':
        return JSON.parse(await this.grep(`metadir/pairs/${schema[branch].dir ?? branch}/index.csv`, `^${branchUUID}`));

      default:
        return this.grep(`metadir/pairs/${schema[branch].dir ?? branch}/index.csv`, `^${branchUUID}`);
    }
  }
}
