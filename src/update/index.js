import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { selectSchema } from "../select/index.js";
import { toSchema } from "../schema.js";
import { updateTabletStream } from "./tablet.js";
import { planUpdate } from "./strategy.js";

export async function updateRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  return new TransformStream({
    async transform(query, controller) {
      const queryStream = ReadableStream.from([{ query }]);

      const strategy = planUpdate(schema, query);

      const streams = strategy.map((tablet) =>
        updateTabletStream(fs, dir, tablet),
      );

      const updateStream = streams.reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      await updateStream.pipeTo(
        new WritableStream({
          async write(state) {
            // push query as entry
            controller.enqueue(state.query);
          },
        }),
      );
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

  const queries = Array.isArray(query) ? query : [query];

  const updateStream = await updateRecordStream({ fs, dir });

  const entries = [];

  await ReadableStream.from(queries)
    .pipeThrough(updateStream)
    .pipeTo(
      new WritableStream({
        write(entry) {
          entries.push(entry);
        },
      }),
    );

  // wait for all streams to finish updating tablets

  return entries;
}
