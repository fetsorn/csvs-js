/* eslint-disable import/extensions */
import { findCrownPaths } from './schema.js';
import { takeKey } from './metadir.js';
import csv from 'papaparse';

export default class Store {
  /**
   * .
   * @type {Object}
   */
  #callback;

  /**
   * schema is the dataset schema.
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
   * Create a dataset instance.
   * @param {Object} callback - Object with callbacks.
   * @param {readFileCallback} callback.readFile - The callback that reads db.
   * @param {writeFileCallback} callback.writeFile - The callback that writes db.
   */
  constructor(callback) {
    this.#callback = callback;
  }

  /**
   * This returns the dataset schema.
   * @name readSchema
   * @function
   * @returns {object} - dataset schema.
   */
  async readSchema() {
    try {
      const schemaString = await this.#callback.readFile('_-_.csv');

      const { data } = csv.parse(schemaString)

      for await (const [trunk, leaf] of data) {
        this.schema[trunk] = { ...this.schema[trunk] }
        // Work with each record
        this.schema[leaf] = { trunk, ...this.schema[leaf] }
      }
    } catch {
      // do nothing if there is no schema
    }
  }

  /**
   * This returns a map of dataset file contents.
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

        // const contentsSorted = contents.split('\n')
        //   .filter((line) => line !== '')
        //   .sort((a, b) => takeKey(a).localeCompare(takeKey(b)))
        //   .join('\n');

        // cache[filePath] = contentsSorted;

        cache[filePath] = contents;
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

  appendOutput(filePath, lines) {
    const output = this.output[filePath] ?? "";

    this.output[filePath] = output + '\n' + lines;
  }

  setOutput(filePath, fileContents) {
    this.output[filePath] = fileContents;
  }

  /**
   * This writes new file contents to the dataset.
   * @name write
   * @function
   */
  async write() {
    await Promise.all(Object.entries(this.output).map(async ([filePath, contents]) => {
      // sort to guarantee that sorted files remain unchanged after update
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
