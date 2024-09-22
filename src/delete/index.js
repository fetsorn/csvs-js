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

    write(record, encoding, callback) {
      const strategy = planPrune(schema, record);

      strategy.forEach((tablet) => {
        pruneTablet(fs, dir, tablet);
      });

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

  await pipeline([queryStream, writeStream]);
}
