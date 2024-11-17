import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { selectSchema } from "../select/index.js";
import { toSchema } from "../schema.js";
import { recordToRelationMap } from "../record.js";
import { findCrown } from "../schema.js";
import { updateTablet } from "./tablet.js";

export async function updateSchemaStream({ fs, dir }) {
  return new TransformStream({
    async transform(record, controller) {
      const filename = `_-_.csv`;

      const relations = Object.fromEntries(
        Object.entries(record)
          .filter(([key]) => key !== "_")
          .map(([key, value]) => [key, Array.isArray(value) ? value : [value]]),
      );

      await updateTablet(fs, dir, relations, filename);

      controller.enqueue(record);
    },
  });
}

export async function updateRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  return new TransformStream({
    async transform(record, controller) {
      const base = record._;

      // build a relation map of the record. tablet -> key -> list of values
      const relationMap = recordToRelationMap(schema, record);

      // for each branch in crown
      const crown = findCrown(schema, base);

      const promises = crown.map((branch) => {
        const { trunk } = schema[branch];

        const filename = `${trunk}-${branch}.csv`;

        return updateTablet(fs, dir, relationMap[filename] ?? {}, filename);
      });

      await Promise.all(promises);

      controller.enqueue(record);
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

  let queries = Array.isArray(query) ? query : [query];

  // TODO find base value if _ is object or array
  // TODO exit if no base field or invalid base value
  const base = queries[0]._;

  const writeStream =
    base === "_"
      ? await updateSchemaStream({ fs, dir })
      : await updateRecordStream({ fs, dir });

  const records = [];

  await ReadableStream.from(queries).pipeThrough(writeStream).pipeTo(
    new WritableStream({
      write(record) {
        records.push(record);
      },
    })
  );

  return records
}
