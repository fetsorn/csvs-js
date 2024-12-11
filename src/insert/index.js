import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { selectSchema } from "../select/index.js";
import { toSchema, findCrown } from "../schema.js";
import { sortFile } from "../stream.js";
import { insertTablet } from "./tablet.js";
import { planInsert } from "./strategy.js";

export async function insertRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  const isInserted = new Map();

  return new TransformStream({
    async transform(query, controller) {
      const queryStream = ReadableStream.from([{ query }]);

      const strategy = planInsert(schema, query);

      const streams = strategy.map((tablet) => {
        isInserted.set(tablet.filename, true);

        return insertTablet(fs, dir, tablet, schema);
      });

      const insertStream = [...streams].reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      await insertStream.pipeTo(
        new WritableStream({
          async write(record) {
            controller.enqueue(record);
          },
        }),
      );
    },

    async flush() {
      const promises = isInserted
        .entries()
        .map(([filename]) => sortFile(fs, dir, filename));

      await Promise.all(promises);
    },
  });
}

export async function insertRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  const insertStream = await insertRecordStream({ fs, dir });

  const entries = [];

  await ReadableStream.from(queries)
    .pipeThrough(insertStream)
    .pipeTo(
      new WritableStream({
        write(record) {
          entries.push(record);
        },
      }),
    );

  return entries;
}
