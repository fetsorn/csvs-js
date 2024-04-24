import Select1 from "./0.0.1/select.js";
import Update1 from "./0.0.1/update.js";
import { grep as grepPolyfill1 } from "./0.0.1/grep.js";
import Select2 from "./0.0.2/select.js";
import Update2 from "./0.0.2/update.js";
import Delete2 from "./0.0.2/delete.js";
import { randomUUID as randomUUIDPolyfill } from "./random.js";
import { detectVersion } from "./version.js";

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
  constructor({ readFile, writeFile, grep: grepCallback, randomUUID: randomUUIDCallback }) {
    this.readFile = readFile;
    this.writeFile = writeFile;
    const grep = grepCallback ?? grepPolyfill1;
    const randomUUID = randomUUIDCallback ?? randomUUIDPolyfill;

    this.select1 = new Select1({ readFile, grep })
    this.select2 = new Select2({ readFile, grep })
    this.update1 = new Update1({ readFile, writeFile, randomUUID })
    this.update2 = new Update2({ readFile, writeFile, randomUUID })
    this.delete2 = new Delete2({ readFile, writeFile, randomUUID })
  }

  /**
   * This returns an array of records from the dataset.
   * @name select
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {Object[]}
   */
  async select(urlSearchParams) {
    // detect dataset version
    const version = await detectVersion(this.readFile);

    if (version === "0.0.1") {
      return this.select1.select(urlSearchParams);
    }
    if (version === "0.0.2") {
      return this.select2.select(urlSearchParams);
    }
  }

  /**
   * This returns a list of values for base branch
   * @name selectBaseKeys
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {string[]} - A dataset record.
   */
  async selectBaseKeys(urlSearchParams) {
    // detect dataset version
    const version = await detectVersion(this.readFile);

    if (version === "0.0.1") {
      return this.select1.selectBaseKeys(urlSearchParams);
    }
    if (version === "0.0.2") {
      return this.select2.selectBaseKeys(urlSearchParams);
    }
  }

  /**
   * This returns a dataset record for a given value of base branch
   * @name buildRecord
   * @function
   * @param {string} base - name of base branch
   * @param {string} baseKey - value of base branch
   * @returns {object} - A dataset record.
   */
  async buildRecord(base, baseKey) {
    // detect dataset version
    const version = await detectVersion(this.readFile);

    if (version === "0.0.1") {
      return this.select1.buildRecord(base, baseKey);
    }
    if (version === "0.0.2") {
      return this.select2.buildRecord(base, baseKey);
    }
  }

  /**
   * This returns a readable stream that yields record objects
   * @name update
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {ReadableStream} - A dataset record.
   */
  async selectStream(urlSearchParams) {
    // detect dataset version
    const version = await detectVersion(this.readFile);

    if (version === "0.0.1") {
      return this.select1.selectStream(urlSearchParams);
    }
    if (version === "0.0.2") {
      return this.select2.selectStream(urlSearchParams);
    }
  }

  /**
   * This updates a dataset record.
   * @name update
   * @function
   * @param {object} record - A dataset record.
   * @returns {object} - A dataset record.
   */
  async update(record) {
    // detect dataset version
    const version = await detectVersion(this.readFile);

    if (version === "0.0.1") {
      return this.update1.update(record);
    }
    if (version === "0.0.2") {
      return this.update2.update(record);
    }
  }

  /**
   * This deletes a dataset record.
   * @name delete
   * @param {object} record - A dataset record.
   * @function
   */
  async delete(record) {
    // detect dataset version
    const version = await detectVersion(this.readFile);

    if (version === "0.0.1") {
      return this.update1.delete(record);
    }
    if (version === "0.0.2") {
      return this.delete2.delete(record);
    }
  }
}
