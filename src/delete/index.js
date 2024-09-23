import stream from "stream";
import { promisify } from "util";
import { planPrune } from "./strategy.js";
import { pruneTablet } from "./tablet.js";
import { toSchema } from "../schema.js";
import { selectSchema } from "../select/index.js";

/**
 * This deletes a record from the dataset.
 * @name updateRecord
 * @param {object} record - A dataset record.
 * @function
 */
export async function deleteRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

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
export async function deleteRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  let records = Array.isArray(query) ? query : [query];

  const queryStream = stream.Readable.from(records);

  const writeStream = await deleteRecordStream({ fs, dir });

  const pipeline = promisify(stream.pipeline);

  return pipeline([queryStream, writeStream]);
}
