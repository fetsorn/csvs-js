import stream from "stream";
import { promisify } from "util";
import { planPrune } from "./strategy.js";
import { pruneTablet } from "./tablet.js";
import { toSchema } from "../schema.js";
import { select } from "../select/index.js";

/**
 * This deletes a record from the dataset.
 * @name updateRecord
 * @param {object} record - A dataset record.
 * @function
 */
export function deleteStream(fs, dir, schema) {
  return new stream.Writable({
    objectMode: true,

    async write(record, encoding, callback) {
      const strategy = planPrune(schema, record);

      const promises = strategy.map((tablet) => pruneTablet(fs, dir, tablet));

      await Promise.all(promises);

      callback();
    },
  });
}

/**
 * This deletes the dataset record.
 * @name delete
 * @param {object} record - A dataset record.
 * @function
 */
export async function deleteRecord(fs, dir, records) {
  const [schemaRecord] = await select(fs, dir, { _: "_" });

  const schema = toSchema(schemaRecord);

  // exit if record is undefined
  if (records === undefined) return;

  let rs = Array.isArray(records) ? records : [records];

  const queryStream = stream.Readable.from(rs);

  const writeStream = deleteStream(fs, dir, schema);

  const pipeline = promisify(stream.pipeline);

  return pipeline([queryStream, writeStream]);
}
