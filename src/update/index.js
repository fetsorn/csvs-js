import stream from "stream";
import { promisify } from "util";
import { findCrown } from "../schema.js";
import { recordToRelationMap } from "./query.js";
import { updateTablet } from "./tablet.js";
import { toSchema } from "../schema.js";
import { selectRecord } from "../select/index.js";

export async function updateSchemaStream({ fs, dir }) {
  // writable
  return new stream.Writable({
    objectMode: true,

    async write(record, encoding, callback) {
      const filename = `_-_.csv`;

      const relations = Object.fromEntries(
        Object.entries(record)
          .filter(([key]) => key !== "_")
          .map(([key, value]) => [key, Array.isArray(value) ? value : [value]]),
      );

      await updateTablet(fs, dir, relations, filename);

      callback();
    },
  });
}

export async function updateRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectRecord({ fs, dir, query: { _: "_" } });

  const schema = toSchema(schemaRecord);

  // writable
  return new stream.Writable({
    objectMode: true,

    async write(record, encoding, callback) {
      const base = record._;

      // build a relation map of the record. tablet -> key -> list of values
      const relationMap = recordToRelationMap(schema, record);

      // for each branch in crown
      const crown = findCrown(schema, base);

      for (const branch of crown) {
        const { trunk } = schema[branch];

        const filename = `${trunk}-${branch}.csv`;

        await updateTablet(fs, dir, relationMap[filename] ?? {}, filename);
      }

      callback();
    },

    close() {},

    abort(err) {
      console.log("Sink error:", err);
    },
  });
}

/**
 * This updates the dataset record.
 * @name update
 * @function
 * @param {object} record - A dataset record.
 * @returns {object} - A dataset record.
 */
export async function updateRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  let records = Array.isArray(query) ? query : [query];

  // TODO find base value if _ is object or array
  // TODO exit if no base field or invalid base value
  const base = records[0]._;

  const queryStream = stream.Readable.from(records);

  const writeStream =
    base === "_"
      ? await updateSchemaStream({ fs, dir })
      : await updateRecordStream({ fs, dir });

  const pipeline = promisify(stream.pipeline);

  await pipeline([queryStream, writeStream]);
}
