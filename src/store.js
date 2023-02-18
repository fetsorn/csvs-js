/* eslint-disable import/extensions */
import { findCrownPaths } from './schema.js';

export default class Store {
  /**
   * .
   * @type {Object}
   */
  #callback;

  /**
   * schema is the database schema.
   * @type {object}
   */
  schema = {};

  /**
   * cache is the map of file paths to file contents.
   * @type {object}
   */
  cache = {};

  /**
   * output is the map of file paths to file contents to write.
   * @type {URLSearchParams}
   */
  output = {};

  /**
   * Create a database instance.
   * @param {Object} callback - Object with callbacks.
   * @param {readFileCallback} callback.readFile - The callback that reads db.
   * @param {writeFileCallback} callback.writeFile - The callback that writes db.
   */
  constructor(callback) {
    this.#callback = callback;
  }

  /**
   * This returns the database schema.
   * @name readSchema
   * @function
   * @returns {object} - database schema.
   */
  async readSchema() {
    this.schema = JSON.parse(await this.#callback.readFile('metadir.json'));
  }

  /**
   * This returns a map of database file contents.
   * @name read
   * @function
   * @param {string} base - Base branch.
   * @returns {Map} - Map of file paths to file contents.
   */
  async read(base) {
    // get array of all filepaths required to search for base branch
    const filePaths = findCrownPaths(this.schema, base);

    const cache = {};

    await Promise.all(filePaths.map(async (filePath) => {
      try {
        cache[filePath] = (await this.#callback.readFile(filePath)) ?? '\n';
      } catch (e) {
        // console.log(e);
        cache[filePath] = '\n';
      }
    }));

    this.cache = cache;
  }

  /**
   * This returns a map of database file contents.
   * @name write
   * @function
   */
  async write() {
    await Promise.all(Object.entries(this.output).map(async ([filePath, contents]) => {
      await this.#callback.writeFile(filePath, contents);
    }));

    this.output = {};
  }
}
