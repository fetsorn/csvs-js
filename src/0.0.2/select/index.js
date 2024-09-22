import stream from "stream";
// use promisify instead of stream/promises.pipeline to allow polyfills
import { promisify } from "util";
import { parseTablet } from "./tablet.js";
import { parseTabletAccumulating } from "./accumulating.js";
import { planValues, planOptions, planQuery, planSchema } from "./strategy.js";
import { toSchema } from "../schema.js";

/** Class representing a dataset query. */
export default class Select {
  constructor() {}

  /**
   * This returns the schema record for the dataset
   * @name selectSchema
   * @function
   * @returns {Object[]}
   */
  async #selectSchema(fs, dir) {
    let recordSchema = { _: "_" };

    const queryStream = stream.Readable.from([{ record: recordSchema }]);

    const schemaStrategy = planSchema();

    const streams = schemaStrategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(fs, dir, tablet)
        : parseTablet(fs, dir, tablet),
    );

    return [queryStream, ...streams];
  }

  async selectStream(fs, dir, query) {
    // there can be only one root base in search query
    // TODO: validate against arrays of multiple bases, do not return [], throw error
    const base = query._;

    // if no base is provided, return empty
    if (base === undefined) return [];

    if (base === "_") return this.#selectSchema(fs, dir);

    const [schemaRecord] = await this.select(fs, dir, { _: "_" });

    const schema = toSchema(schemaRecord);

    const queryStream = stream.Readable.from([{ query }]);

    const queryStrategy = planQuery(schema, query);

    const baseStrategy =
      queryStrategy.length > 0 ? queryStrategy : planOptions(schema, base);

    const valueStrategy = planValues(schema, query);

    const strategy = [...baseStrategy, ...valueStrategy];

    const streams = strategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(fs, dir, tablet)
        : parseTablet(fs, dir, tablet),
    );

    const leader = query.__;

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
   * @returns {Object[]}
   */
  async select(fs, dir, query) {
    const streams = await this.selectStream(fs, dir, query);

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

  async selectBaseKeys(fs, dir, query) {
    // there can be only one root base in search query
    // TODO: validate against arrays of multiple bases, do not return [], throw error
    const base = query._;

    // if no base is provided, return empty
    if (base === undefined) return [];

    if (base === "_") return this.#selectSchema(fs, dir);

    const [schemaRecord] = await this.select(fs, dir, { _: "_" });

    const schema = toSchema(schemaRecord);

    const queryStream = stream.Readable.from([{ query }]);

    // console.log(query);
    const strategy = planQuery(schema, query);

    const streams = strategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(fs, dir, tablet)
        : parseTablet(fs, dir, tablet),
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

  async buildRecord(fs, dir, record) {
    const [schemaRecord] = await this.select(fs, dir, { _: "_" });

    const schema = toSchema(schemaRecord);

    const queryStream = stream.Readable.from([{ record }]);

    const strategy = planValues(schema);

    const streams = strategy.map((tablet) =>
      tablet.accumulating
        ? parseTabletAccumulating(fs, dir, tablet)
        : parseTablet(fs, dir, tablet),
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
