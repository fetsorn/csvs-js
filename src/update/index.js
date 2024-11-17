import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { selectSchema } from "../select/index.js";
import { toSchema } from "../schema.js";
import { recordToRelationMap } from "../record.js";
import { updateTabletStream } from "./tablet.js";
import { planUpdateSchema, planUpdate } from "./strategy.js";

export async function updateSchemaStream({ fs, dir }) {
  return new TransformStream({
    async transform(query, controller) {
      const queryStream = ReadableStream.from([{ query }]);

      const strategy = planUpdateSchema(schema, query);

      const streams = strategy.map((tablet) =>
        updateTabletStream(fs, dir, tablet)
      );

      const schemaStream = [...streams].reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      controller.enqueue(query);
    },
  });
}

export async function updateRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  return new TransformStream({
    async transform(query, controllerOuter) {
      const base = query._;

      const queryStream = ReadableStream.from([{ query }]);

      const strategy = planUpdate(schema, query);

      const streams = strategy.map((tablet) =>
        updateTabletStream(fs, dir, tablet)
      );

      const schemaStream = [...streams].reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      await schemaStream.pipeTo(new WritableStream({
        async write(record) {
          controllerOuter.enqueue(record)
        }
      }))
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

  // wait for all streams to finish updating tablets

  return records
}
