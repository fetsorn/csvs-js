import csv from "papaparse";
import { findCrownPaths } from "./schema.js";

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
      const schemaString = await this.#callback.readFile("_-_.csv");

      this.cache["_-_.csv"] = schemaString;

      const { data } = csv.parse(schemaString);

      for await (const relation of data) {
        if (relation.length === 1 && relation[0] === "") continue;

        const [trunk, leaf] = relation;

        this.schema[trunk] = { ...this.schema[trunk] };
        // Work with each record
        this.schema[leaf] = { trunk, ...this.schema[leaf] };
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
  async read(schema, base) {
    // get array of all filepaths required to search for base branch
    const filepaths = findCrownPaths(schema, base);

    const cache = {};

    await Promise.all(
      filepaths.map(async (filepath) => {
        try {
          const contents = await this.#callback.readFile(filepath);

          // const contentsSorted = contents.split('\n')
          //   .filter((line) => line !== '')
          //   .sort((a, b) => takeKey(a).localeCompare(takeKey(b)))
          //   .join('\n');

          // cache[filepath] = contentsSorted;

          cache[filepath] = contents ?? "";
        } catch {
          // console.log(e);
          cache[filepath] = "";
        }
      }),
    );

    this.cache = cache;
  }

  /**
   * This returns the contents of a filepath
   * @name getCache
   * @function
   * @param {string} filepath - Path to the file
   * @returns {string} - Contents of the file.
   */
  getCache(filepath) {
    return this.cache[filepath];
  }

  /**
   * This returns the contents of a filepath that will be written
   * @name getOutput
   * @function
   * @param {string} filepath - Path to the file
   * @returns {string} - Contents of the file.
   */
  getOutput(filepath) {
    return this.output[filepath];
  }

  /**
   * This appends a line to the a filepath that will be written
   * @name appendOutput
   * @function
   * @param {string} filepath - Path to the file
   * @param {string} lines - Newline-separated strings
   */
  appendOutput(filepath, lines) {
    const output = this.output[filepath] ?? "";

    this.output[filepath] = `${output}\n${lines}`;
  }

  /**
   * This sets contents of a filepath that will be written
   * @name setOutput
   * @function
   * @param {string} filepath - Path to the file
   * @param {string} contents - Newline-separated strings
   */
  setOutput(filepath, contents) {
    this.output[filepath] = contents;
  }

  /**
   * This writes new file contents to the dataset.
   * @name write
   * @function
   */
  async write() {
    await Promise.all(
      Object.entries(this.output).map(async ([filepath, contents]) => {
        // TODO: remove this and guarantee idempotence by diffing changeset in update()
        // sort to guarantee that sorted files remain unchanged after update
        const contentsSorted = `${contents
          .split("\n")
          .filter((line) => line !== "")
          .sort((a, b) => a.localeCompare(b))
          .join("\n")}\n`;

        await this.#callback.writeFile(filepath, contentsSorted);
      }),
    );

    this.output = {};
  }
}
