/* eslint-disable import/extensions */
import { findCrownPaths } from './schema.js';
import { takeUUID } from './metadir.js';
import { parse } from 'csv-parse';

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
    const schemaString = await this.#callback.readFile('_-_.csv');

    const parser = await parse(schemaString)

    for await (const [trunk,leaf] of parser) {
      this.schema[trunk] = { ...this.schema[trunk] }
      // Work with each record
      this.schema[leaf] = { trunk, ...this.schema[leaf] }
    }
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
        const contents = (await this.#callback.readFile(filePath)) ?? '\n';

        const contentsSorted = contents.split('\n')
          .filter((line) => line !== '')
          .sort((a, b) => takeUUID(a).localeCompare(takeUUID(b)))
          .join('\n');

        cache[filePath] = contentsSorted;
      } catch (e) {
        // console.log(e);
        cache[filePath] = '\n';
      }
    }));

    this.cache = cache;
  }

  getCache(filePath) {
    return this.cache[filePath];
  }

  getOutput(filePath) {
    return this.output[filePath];
  }

  setOutput(filePath, fileContents) {
    this.output[filePath] = fileContents;
  }

  /**
   * This returns a map of database file contents.
   * @name write
   * @function
   */
  async write() {
    await Promise.all(Object.entries(this.output).map(async ([filePath, contents]) => {
      const contentsSorted = `${contents.split('\n')
        .filter((line) => line !== '')
        .sort((a, b) => a.localeCompare(b))
        .join('\n')
      }\n`;

      await this.#callback.writeFile(filePath, contentsSorted);
    }));

    this.output = {};
  }
}
