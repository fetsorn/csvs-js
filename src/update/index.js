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
      const queryStream = new ReadableStream({
        start(controller) {
          controller.enqueue(query)

          controller.close()
        }
      })

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
          async write(query) {
            // push query as entry
            controller.enqueue(query);
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

  const queryStream = new ReadableStream({
    start(controller) {
      for (const q of queries) {
        controller.enqueue(q)
      }

      controller.close()
    }
  })

  const updateStream = await updateRecordStream({ fs, dir });

  const entries = [];

  await queryStream
    .pipeThrough(updateStream)
    .pipeTo(
      new WritableStream({
        write(entry) {
          entries.push(entry);
        },
      }),
    );

  return entries;
}
