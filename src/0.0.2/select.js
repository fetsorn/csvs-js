import { condense } from "./schema.js";
import Store from "./store.js";
import {
  searchParamsToQuery,
  recordToRelationMap,
  buildRecord,
  findValues,
  findQueries,
  findKeys,
} from "./bin.js";

/** Class representing a dataset query. */
export default class Query {
  /**
   * .
   * @type {Store}
   */
  #store;

  /**
   * Create a dataset instance.
   * @param {Object} callback - Object with callbacks.
   * @param {readFileCallback} callback.readFile - The callback that reads db.
   * @param {grepCallback} callback.grep - The callback that searches files.
   */
  constructor(callback) {
    this.#store = new Store(callback);
  }

  /**
   * This returns an array of records from the dataset.
   * @name select
   * @function
   * @param {URLSearchParams} urlSearchParams - search params from a query string.
   * @returns {Object[]}
   */
  async select(urlSearchParams) {
    await this.#store.readSchema();

    const query = searchParamsToQuery(this.#store.schema, urlSearchParams);

    // there can be only one root base in search query
    // TODO: validate against arrays of multiple bases, do not return [], throw error
    const base = query._;

    // if no base is provided, return empty
    if (base === undefined) return [];

    // get a map of dataset file contents
    await this.#store.read(base);

    const queryMap = recordToRelationMap(this.#store.schema, query);

    const isQueriedMap = findQueries(this.#store.schema, queryMap, base);

    const keyMap = findKeys(
      this.#store.schema,
      this.#store.cache,
      query,
      queryMap,
      isQueriedMap,
      base,
    );

    const valueMap = findValues(
      this.#store.schema,
      this.#store.cache,
      keyMap,
      base,
    );

    const keysBase = keyMap[base] ?? [];

    const records = keysBase.map((key) =>
      condense(
        this.#store.schema,
        buildRecord(this.#store.schema, valueMap, base, key),
      ),
    );

    return records;
  }
}
