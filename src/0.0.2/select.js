import csv from "papaparse";
import Store from "./store.js";
import {
  searchParamsToQuery,
  recordToRelationMap,
  buildRecord,
  findValues,
  findQueries,
  findKeys,
  condense
} from "./bin.js";

/** Class representing a dataset query. */
export default class Select {
  /**
   * .
   * @type {Store}
   */
  #store;

  /**
   * .
   * @type {HashSet}
   */
  #valueMap;

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

    if (base === "_") return this.#selectSchema(query);

    // get a map of dataset file contents
    await this.#store.read(base);

    const queryMap = recordToRelationMap(this.#store.schema, query);

    const isQueriedMap = findQueries(this.#store.schema, queryMap, base);

    const keyMap = await findKeys(
      this.#store.schema,
      this.#store.cache,
      query,
      queryMap,
      isQueriedMap,
      base,
    );

    const valueMap = await findValues(
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

  /**
   * This returns the schema record for the dataset
   * @name selectSchema
   * @function
   * @param {Object} query - search query object
   * @returns {Object[]}
   */
  async #selectSchema(query) {
    let recordSchema = { _:"_" };

    const tablet = this.#store.cache["_-_.csv"];

    csv.parse(tablet, {
      step: (row) => {
        if (row.data.length === 1 && row.data[0] === "") return;

        const [key, value] = row.data;

        const values = recordSchema[key] ?? [];

        const valuesNew = [ ...values, value ];

        recordSchema[key] = valuesNew;
      }
    })

    return [ recordSchema ]
  }

  /**
   * This returns a list of values for base branch
   * @name selectBaseKeys
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {string[]} - A dataset record.
   */
  async selectBaseKeys(urlSearchParams) {
    await this.#store.readSchema();

    const query = searchParamsToQuery(this.#store.schema, urlSearchParams);

    // there can be only one root base in search query
    // TODO: validate against arrays of multiple bases, do not return [], throw error
    const base = query._;

    // if no base is provided, return empty
    if (base === undefined) return [];

    if (base === "_") return this.#selectSchema(query);

    // get a map of dataset file contents
    await this.#store.read(base);

    const queryMap = recordToRelationMap(this.#store.schema, query);

    const isQueriedMap = findQueries(this.#store.schema, queryMap, base);

    const keyMap = await findKeys(
      this.#store.schema,
      this.#store.cache,
      query,
      queryMap,
      isQueriedMap,
      base,
    );

    const valueMap = await findValues(
      this.#store.schema,
      this.#store.cache,
      keyMap,
      base,
    );

    // save valueMap for later reuse by buildRecord
    this.#valueMap = valueMap;

    const baseKeys = keyMap[base] ?? [];

    return { base, baseKeys };
  }

  /**
   * This returns a dataset record for a given value of base branch
   * @name buildRecord
   * @function
   * @param {string} base - name of base branch
   * @param {string} baseKey - value of base branch
   * @returns {object} - A dataset record.
   */
  buildRecord(base, baseKey) {
    // reuse valueeMap from selectBaseKeys
    const record = buildRecord(this.#store.schema, this.#valueMap, base, baseKey);

    const recordCondensed = condense(this.#store.schema, record);

    return recordCondensed
  }
}
