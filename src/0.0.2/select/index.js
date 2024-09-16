import stream from "stream";
// use promisify instead of stream/promises.pipeline to allow polyfills
import { promisify } from "util";
import csv from "papaparse";
import Store from "../store.js";
import { recordToRelationMap, findQueries } from "../query.js";
import { searchParamsToQuery } from "./compat.js";
import { parseDataset } from "./dataset.js";
import { planStrategy } from "./core/index.js";

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

  async selectStream(urlSearchParams) {
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

    const queryStream = stream.Readable.from([query]);

    const queryMap = recordToRelationMap(this.#store.schema, query);

    const isQueriedMap = findQueries(this.#store.schema, queryMap, base);

    // console.log(query);
    const strategy = planStrategy(
      this.#store.schema,
      queryMap,
      isQueriedMap,
      query,
      base,
    );

    const streams = parseDataset(
      this.#store.schema,
      this.#store.cache,
      strategy,
    );

    const leader = query.__;

    const leaderStream = new stream.Transform({
      objectMode: true,

      transform(record, encoding, callback) {
        // TODO account for nested leader
        // TODO account for a list of leader values
        this.push(record[leader]);

        callback();
      },
    });

    const leaderPartial = leader && leader !== base ? [leaderStream] : [];

    // TODO rewrite to stream.compose
    return [queryStream, ...streams, ...leaderPartial];
  }

  /**
   * This returns an array of records from the dataset.
   * @name select
   * @function
   * @param {URLSearchParams} urlSearchParams - search params from a query string.
   * @returns {Object[]}
   */
  async select(urlSearchParams) {
    const streams = await this.selectStream(urlSearchParams);

    var records = [];

    const collectStream = new stream.Writable({
      objectMode: true,

      write(state, encoding, callback) {
        records.push(state);

        callback();
      },

      close() {},

      abort(err) {
        console.log("Sink error:", err);
      },
    });

    const pipeline = promisify(stream.pipeline);

    await pipeline([...streams, collectStream]);

    return records;
  }
}
