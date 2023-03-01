/* eslint-disable import/extensions */
import Query from './query.js';
import Entry from './entry.js';
import { grep as grepPolyfill } from './grep.js';
import { randomUUID as randomUUIDPolyfill } from './random.js';

export default class CSVS {
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
  readFile;

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
  writeFile;

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
  grep;

  /**
   * This callback returns a UUID.
   * @callback randomUUIDCallback
   * @returns {string} - UUID compliant with RFC 4122
   */

  /**
   * randomUUID is the callback that returns a UUID.
   * @type {randomUUIDCallback}
   */
  randomUUID;

  /**
   * Create a database instance.
   * @param {Object} args - Object with callbacks.
   * @param {readFileCallback} args.readFile - The callback that reads db.
   * @param {writeFileCallback} args.writeFile - The callback that writes db.
   * @param {grepCallback} args.grep - The callback that searches files.
   * @param {randomUUIDCallback} args.randomUUID - The callback that returns a UUID.
   */
  constructor({
    readFile, writeFile, grep, randomUUID,
  }) {
    this.readFile = readFile;
    this.writeFile = writeFile;
    this.grep = grep ?? grepPolyfill;
    this.randomUUID = randomUUID ?? randomUUIDPolyfill;
  }

  /**
   * This returns an array of entries from the database.
   * @name select
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {Object[]}
   */
  async select(urlSearchParams) {
    const { readFile, grep } = this;

    return (new Query({ readFile, grep })).select(urlSearchParams);
  }

  /**
   * This updates the database entry.
   * @name update
   * @function
   * @param {object} entry - A database entry.
   * @returns {object} - A database entry.
   */
  async update(entry) {
    const {
      readFile, writeFile, randomUUID,
    } = this;

    return (new Entry({
      readFile, writeFile, randomUUID,
    }).update(entry));
  }

  /**
   * This deletes the database entry.
   * @name delete
   * @param {object} entry - A database entry.
   * @function
   */
  async delete(entry) {
    const {
      readFile, writeFile, randomUUID,
    } = this;

    return (new Entry({
      readFile, writeFile, randomUUID,
    }).delete(entry));
  }
}
