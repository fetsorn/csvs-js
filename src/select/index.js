import stream from "stream";
// use promisify instead of stream/promises.pipeline to allow polyfills
import { promisify } from "util";
import { parseTablet, parseTabletAccumulating } from "./tablet.js";
import { planValues, planOptions, planQuery, planSchema } from "./strategy.js";
import { toSchema } from "../schema.js";

/**
 * This returns a Transform stream
 * @name selectSchemaStream
 * @function
 * @returns {Transform}
 */
export async function selectSchemaStream({ fs, dir }) {
  let recordSchema = { _: "_" };

  const queryStream = stream.Readable.from([{ record: recordSchema }]);

  const schemaStrategy = planSchema();

  const promises = schemaStrategy.map((tablet) =>
    tablet.accumulating
      ? parseTabletAccumulating(fs, dir, tablet)
      : parseTablet(fs, dir, tablet),
  );

  const streams = await Promise.all(promises);

  const leaderStream = new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      // TODO account for nested leader
      // TODO account for a list of leader values
      if (state.record) {
        this.push(state.record);
      }

      callback();
    },
  });

  return [queryStream, ...streams, leaderStream];
}

/**
 * This returns a list with schema record
 * @name selectSchema
 * @function
 * @returns {Object[]}
 */
export async function selectSchema({ fs, dir }) {
  const streams = await selectSchemaStream({ fs, dir });

  var records = [];

  const collectStream = new stream.Writable({
    objectMode: true,

    write(record, encoding, callback) {
      records.push(record);

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

/**
 * This returns a Transform stream
 * @name selectRecordStream
 * @function
 * @returns {Transform}
 */
export async function selectRecordStream({ fs, dir, query }) {
  // there can be only one root base in search query
  // TODO: validate against arrays of multiple bases, do not return [], throw error
  const base = query._;

  // if no base is provided, return empty
  if (base === undefined) return [];

  if (base === "_") return selectSchemaStream({ fs, dir });

  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  const queryStream = stream.Readable.from([{ query }]);

  const queryStrategy = planQuery(schema, query);

  const baseStrategy =
    queryStrategy.length > 0 ? queryStrategy : planOptions(schema, base);

  const valueStrategy = planValues(schema, query);

  const strategy = [...baseStrategy, ...valueStrategy];

  const promises = strategy.map((tablet) =>
    tablet.accumulating
      ? parseTabletAccumulating(fs, dir, tablet)
      : parseTablet(fs, dir, tablet),
  );

  const streams = await Promise.all(promises);

  const leader = query.__;

  const leaderStream = new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      const record =
        leader && leader !== base ? state.record[leader] : state.record;

      // TODO account for nested leader
      // TODO account for a list of leader values
      if (record) {
        this.push(record);
      }

      callback();
    },
  });

  // TODO rewrite to stream.compose
  return [queryStream, ...streams, leaderStream];
}

/**
 * This returns a list of base records
 * @name selectBase
 * @function
 * @returns {Object[]}
 */
export async function selectBase({ fs, dir, query }) {
  // there can be only one root base in search query
  // TODO: validate against arrays of multiple bases, do not return [], throw error
  const base = query._;

  // if no base is provided, return empty
  if (base === undefined) return [];

  const [schemaRecord] = await selectSchema({ fs, dir });

  if (base === "_") return [schemaRecord];

  const schema = toSchema(schemaRecord);

  const queryStream = stream.Readable.from([{ query }]);

  const queryStrategy = planQuery(schema, query);

  const strategy =
    queryStrategy.length > 0 ? queryStrategy : planOptions(schema, base);

  const promises = strategy.map((tablet) =>
    tablet.accumulating
      ? parseTabletAccumulating(fs, dir, tablet)
      : parseTablet(fs, dir, tablet),
  );

  const streams = await Promise.all(promises);

  const leader = query.__;

  // preserve leader for building values later
  const leaderStream = new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      const record =
        leader && leader !== base
          ? { ...state.record, __: leader }
          : state.record;

      // TODO account for nested leader
      // TODO account for a list of leader values
      if (record !== undefined) {
        this.push(record);
      }

      callback();
    },
  });

  var records = [];

  const collectStream = new stream.Writable({
    objectMode: true,

    write(record, encoding, callback) {
      records.push(record);

      callback();
    },

    close() {},

    abort(err) {
      console.log("Sink error:", err);
    },
  });

  const pipeline = promisify(stream.pipeline);

  await pipeline([queryStream, ...streams, leaderStream, collectStream]);

  return records;
}

/**
 * This returns a list of complete records
 * @name selectBody
 * @function
 * @returns {Object[]}
 */
export async function selectBody({ fs, dir, query }) {
  const base = query._;

  const [schemaRecord] = await selectSchema({ fs, dir });

  if (base === "_") return schemaRecord;

  const schema = toSchema(schemaRecord);

  const queryStream = stream.Readable.from([{ record: query }]);

  const strategy = planValues(schema, query);

  const promises = strategy.map((tablet) =>
    tablet.accumulating
      ? parseTabletAccumulating(fs, dir, tablet)
      : parseTablet(fs, dir, tablet),
  );

  const streams = await Promise.all(promises);

  const leader = query.__;

  const leaderStream = new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      const record =
        leader && leader !== base ? state.record[leader] : state.record;

      if (record !== undefined) {
        // TODO account for nested leader
        // TODO account for a list of leader values
        this.push(record);
      }

      callback();
    },
  });

  var records = [];

  const collectStream = new stream.Writable({
    objectMode: true,

    write(record, encoding, callback) {
      records.push(record);

      callback();
    },

    close() {},

    abort(err) {
      console.log("Sink error:", err);
    },
  });

  const pipeline = promisify(stream.pipeline);

  await pipeline([queryStream, ...streams, leaderStream, collectStream]);

  // takes record with base
  // returns record with values
  return records[0];
}

/**
 * This returns a list of records
 * @name selectRecord
 * @function
 * @returns {Object[]}
 */
export async function selectRecord({ fs, dir, query }) {
  const streams = await selectRecordStream({ fs, dir, query });

  var records = [];

  const collectStream = new stream.Writable({
    objectMode: true,

    write(record, encoding, callback) {
      records.push(record);

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
