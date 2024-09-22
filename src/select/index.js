import stream from "stream";
// use promisify instead of stream/promises.pipeline to allow polyfills
import { promisify } from "util";
import { parseTablet } from "./tablet.js";
import { parseTabletAccumulating } from "./accumulating.js";
import { planValues, planOptions, planQuery, planSchema } from "./strategy.js";
import { toSchema } from "../schema.js";

/**
 * This returns the schema record for the dataset
 * @name selectSchema
 * @function
 * @returns {Object[]}
 */
export async function selectSchema(fs, dir) {
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

export async function selectStream(fs, dir, query) {
  // there can be only one root base in search query
  // TODO: validate against arrays of multiple bases, do not return [], throw error
  const base = query._;

  // if no base is provided, return empty
  if (base === undefined) return [];

  if (base === "_") return selectSchema(fs, dir);

  const [schemaRecord] = await select(fs, dir, { _: "_" });

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
export async function select(fs, dir, query) {
  const streams = await selectStream(fs, dir, query);

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

export async function selectBaseKeys(fs, dir, query) {
  // there can be only one root base in search query
  // TODO: validate against arrays of multiple bases, do not return [], throw error
  const base = query._;

  // if no base is provided, return empty
  if (base === undefined) return [];

  const [schemaRecord] = await select(fs, dir, { _: "_" });

  if (base === "_") return [schemaRecord];

  const schema = toSchema(schemaRecord);

  const queryStream = stream.Readable.from([{ query }]);

  const queryStrategy = planQuery(schema, query);

  const strategy =
    queryStrategy.length > 0 ? queryStrategy : planOptions(schema, base);

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

  const leader = query.__;

  // preserve leader for building values later
  const leaderStream = new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      // TODO account for nested leader
      // TODO account for a list of leader values
      this.push({ record: { ...state.record, __: leader } });

      callback();
    },
  });

  const leaderPartial = leader && leader !== base ? [leaderStream] : [];

  const pipeline = promisify(stream.pipeline);

  await pipeline([queryStream, ...streams, ...leaderPartial, collectStream]);

  return records;
}

export async function buildRecord(fs, dir, record) {
  const base = record._;

  const [schemaRecord] = await select(fs, dir, { _: "_" });

  if (base === "_") return schemaRecord;

  const schema = toSchema(schemaRecord);

  const queryStream = stream.Readable.from([{ record }]);

  const strategy = planValues(schema, record);

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

  const leader = record.__;

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

  const pipeline = promisify(stream.pipeline);

  await pipeline([queryStream, ...streams, ...leaderPartial, collectStream]);

  // takes record with base
  // returns record with values
  return records[0];
}
