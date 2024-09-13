import stream from "stream";
import csv from "papaparse";
import Store from "./store.js";
import {
  searchParamsToQuery,
  recordToRelationMap,
  buildRecord,
  findValues,
  findQueries,
  findKeys,
  condense,
  shell,
  findStrategyShell
} from "./bin.js";

/** Class representing a dataset query. */
export default class Select {
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

    const leader = urlSearchParams.get("__");

    // if no base is provided, return empty
    if (base === undefined) return [];

    if (base === "_") return this.#selectSchema(query);

    // get a map of dataset file contents
    await this.#store.read(base);

    const queryMap = recordToRelationMap(this.#store.schema, query);

    const isQueriedMap = findQueries(this.#store.schema, queryMap, base);

    const strategy = findStrategyShell(this.#store.schema, query, queryMap, isQueriedMap, base);

    const records = await shell(
      this.#store.schema,
      this.#store.cache,
      query,
      queryMap,
      isQueriedMap,
      base,
      strategy,
    );

    // const baseKeys = await findKeys(
    //   this.#store.schema,
    //   this.#store.cache,
    //   query,
    //   queryMap,
    //   isQueriedMap,
    //   base,
    // );

    // const valueMap = await findValues(
    //   this.#store.schema,
    //   this.#store.cache,
    //   base,
    //   baseKeys,
    // );

    // const records = baseKeys.map((key) =>
    //   condense(
    //     this.#store.schema,
    //     buildRecord(this.#store.schema, valueMap, base, key),
    //   ),
    // );

    if (leader && leader !== base) {
      return records.map((record) => record[leader]).filter(Boolean)
    }

    return records;
  }

  async selectStream(urlSearchParams) {
    await this.#store.readSchema();

    const base = urlSearchParams.get("_");

    const leader = urlSearchParams.get("__");

    // if no base is provided, find first schema root
    if (base === null) throw new Error("base is not defined");

    const query = searchParamsToQuery(this.#store.schema, urlSearchParams);

    if (base === "_")
      return new stream.Readable.from(await this.#selectSchema(query));

    // get a map of database file contents
    await this.#store.read(base);

    // get an array of base keys
    const { baseKeys } = await this.selectBaseKeys(urlSearchParams);

    const selectInstance = this;

    return new stream.Readable({
      objectMode: true,

      async read() {
        if (this._buffer === undefined) {
          this._buffer = baseKeys;
        }

        const baseKey = this._buffer.pop();

        const record = await selectInstance.buildRecord(base, baseKey);

        if (leader && leader !== base) {
          const recordLeader = record[leader];

          if (recordLeader) {
            this.push(recordLeader);
          }
        } else {
          this.push(record);
        }

        if (this._buffer.length === 0) {
          this.push(null);
        }
      },
    });
  }

  /**
   * This returns the schema record for the dataset
   * @name selectSchema
   * @function
   * @returns {Object[]}
   */
  async #selectSchema() {
    let recordSchema = { _: "_" };

    const tablet = this.#store.cache["_-_.csv"];

    csv.parse(tablet, {
      step: (row) => {
        if (row.data.length === 1 && row.data[0] === "") return;

        const [key, value] = row.data;

        const values = recordSchema[key] ?? [];

        const valuesNew = [...values, value];

        recordSchema[key] = valuesNew;
      },
    });

    return [recordSchema];
  }

  /**
   * This returns a list of values for base branch
   * @name selectBaseKeys
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {object} - A dataset record.
   */
  async selectBaseKeys(urlSearchParams) {
    await this.#store.readSchema();

    const query = searchParamsToQuery(this.#store.schema, urlSearchParams);

    // there can be only one root base in search query
    // TODO: validate against arrays of multiple bases, do not return [], throw error
    const base = query._;

    // if no base is provided, return empty
    if (base === undefined) return {};

    if (base === "_") return this.#selectSchema(query);

    // get a map of dataset file contents
    await this.#store.read(base);

    const queryMap = recordToRelationMap(this.#store.schema, query);

    const isQueriedMap = findQueries(this.#store.schema, queryMap, base);

    const baseKeys = await findKeys(
      this.#store.schema,
      this.#store.cache,
      query,
      queryMap,
      isQueriedMap,
      base,
    );

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
  async buildRecord(base, baseKey) {
    const valueMap = await findValues(
      this.#store.schema,
      this.#store.cache,
      base,
      [baseKey],
    );

    const record = buildRecord(this.#store.schema, valueMap, base, baseKey);

    const recordCondensed = condense(this.#store.schema, record);

    return recordCondensed;
  }
}
