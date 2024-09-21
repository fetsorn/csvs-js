import stream from "stream";
// use promisify instead of stream/promises.pipeline to allow polyfills
import { promisify } from "util";
import Store from "../store.js";
import { searchParamsToQuery } from "./compat.js";
import { parseTablet } from "./tablet.js";
import { parseTabletAccumulating } from "./accumulating.js";
import { planValues, planOptions, planQuery, planSchema } from "./strategy.js";

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

    const queryStream = stream.Readable.from([{ record: recordSchema }]);

    const schemaStrategy = planSchema();

    const streams = schemaStrategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(this.#store.cache, tablet)
        : parseTablet(this.#store.cache, tablet),
    );

    return [queryStream, ...streams];
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

    const queryStream = stream.Readable.from([{ query }]);

    const queryStrategy = planQuery(this.#store.schema, query);

    const baseStrategy =
      queryStrategy.length > 0
        ? queryStrategy
        : planOptions(this.#store.schema, base);

    const valueStrategy = planValues(this.#store.schema, query);

    const strategy = [...baseStrategy, ...valueStrategy];

    const streams = strategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(this.#store.cache, tablet)
        : parseTablet(this.#store.cache, tablet),
    );

    const leader = urlSearchParams.get("__");

    const leaderStream = new stream.Transform({
      objectMode: true,

      transform(state, encoding, callback) {
        // TODO account for nested leader
        // TODO account for a list of leader values
        this.push({ record: state.record[leader] });

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
        if (state.record) {
          records.push(state.record);
        }

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

    const queryStream = stream.Readable.from([{ query }]);

    // console.log(query);
    const strategy = planQuery(this.#store.schema, query);

    const streams = strategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(this.#store.cache, tablet)
        : parseTablet(this.#store.cache, tablet),
    );

    var records = [];

    const collectStream = new stream.Writable({
      objectMode: true,

      write(state, encoding, callback) {
        if (state.record) {
          records.push(state.record);
        }

        callback();
      },

      close() {},

      abort(err) {
        console.log("Sink error:", err);
      },
    });

    const pipeline = promisify(stream.pipeline);

    await pipeline([queryStream, ...streams, collectStream]);

    return records;
  }

  async buildRecord(record) {
    await this.#store.readSchema();

    const base = record._;

    // get a map of dataset file contents
    await this.#store.read(base);

    const queryStream = stream.Readable.from([{ record }]);

    const strategy = planValues(this.#store.schema);

    const streams = strategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(this.#store.cache, tablet)
        : parseTablet(this.#store.cache, tablet),
    );

    var records = [];

    const collectStream = new stream.Writable({
      objectMode: true,

      write(state, encoding, callback) {
        if (state.record) {
          records.push(state.record);
        }

        callback();
      },

      close() {},

      abort(err) {
        console.log("Sink error:", err);
      },
    });

    const pipeline = promisify(stream.pipeline);

    await pipeline([queryStream, ...streams, collectStream]);

    // takes record with base
    // returns record with values
    return records;
  }
}
