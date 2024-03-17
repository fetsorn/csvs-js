/* eslint-disable import/extensions */
import Query1 from './0.0.1/query.js';
import Record1 from './0.0.1/record.js';
import { grep as grepPolyfill1 } from './0.0.1/grep.js';
import Query2 from './0.0.2/query.js';
import Record2 from './0.0.2/record.js';
import { grep as grepPolyfill2 } from './0.0.2/grep.js';
import { randomUUID as randomUUIDPolyfill } from './random.js';
import { detectVersion } from './version.js';

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
   * Create a dataset instance.
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
    this.grep = grep ?? grepPolyfill1;
    this.randomUUID = randomUUID ?? randomUUIDPolyfill;
  }

  /**
   * This returns an array of records from the dataset.
   * @name select
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {Object[]}
   */
  async select(urlSearchParams) {
    const { readFile, grep } = this;

    // detect dataset version
    const version = await detectVersion(readFile);

    if (version === "0.0.1") {
      return (new Query1({ readFile, grep })).select(urlSearchParams);
    } else if (version === "0.0.2") {
      return (new Query2({ readFile, grep })).select(urlSearchParams);
    }
  }

  async selectBaseUUIDs(urlSearchParams) {
    const { readFile, grep } = this;

    // detect dataset version
    const version = await detectVersion(readFile);

    if (version === "0.0.1") {
      return (new Query1({ readFile, grep })).selectBaseUUIDs(urlSearchParams);
    } else if (version === "0.0.2") {
      return (new Query2({ readFile, grep })).selectBaseUUIDs(urlSearchParams);
    }
  }

  async buildRecord(base, baseUUID) {
    const { readFile, grep } = this;

    // detect dataset version
    const version = await detectVersion(readFile);

    if (version === "0.0.1") {
      return (new Query1({ readFile, grep })).buildRecord(base, baseUUID);
    } else if (version === "0.0.2") {
      return (new Query2({ readFile, grep })).buildRecord(base, baseUUID);
    }
  }

  /**
   * This updates the dataset record.
   * @name update
   * @function
   * @param {object} record - A dataset record.
   * @returns {object} - A dataset record.
   */
  async update(record) {
    const {
      readFile, writeFile, randomUUID,
    } = this;

    // detect dataset version
    const version = await detectVersion(readFile);

    if (version === "0.0.1") {
      return (new Record1({
        readFile, writeFile, randomUUID,
      }).update(record));
    } else if (version === "0.0.2") {
      return (new Record2({
        readFile, writeFile, randomUUID,
      }).update(record));
    }
  }

  /**
   * This deletes the dataset record.
   * @name delete
   * @param {object} record - A dataset record.
   * @function
   */
  async delete(record) {
    const {
      readFile, writeFile, randomUUID,
    } = this;

    // detect dataset version
    const version = await detectVersion(readFile);

    if (version === "0.0.1") {
      return (new Record1({
        readFile, writeFile, randomUUID,
      }).delete(record));
    } else if (version === "0.0.2") {
      return (new Record2({
        readFile, writeFile, randomUUID,
      }).delete(record));
    }
  }
}
