import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from "@swimburger/isomorphic-streams";
import { toSchema } from "../schema.js";
import { planSelect } from "./strategy.js";
import { selectTabletStream } from "./tablet.js";

/**
 * This returns a Transform stream
 * @name selectRecordStream
 * @function
 * @returns {Transform}
 */
export async function selectRecordStream({ fs, dir }) {
  return new TransformStream({
    async transform(query, controllerOuter) {
      const isSchema = query._ === "_";

      const schema = isSchema
        ? undefined
        : toSchema((await selectSchema({ fs, dir }))[0]);

      // there can be only one root base in search query
      // TODO: validate against arrays of multiple bases, do not return [], throw error
      const base = query._;

      // if no base is provided, return empty
      if (base === undefined) return undefined;

      const queryStream = ReadableStream.from([{ record: isSchema ? query : undefined, query }]);

      const strategy = planSelect(schema, query);

      const streams = strategy.map((tablet) =>
        selectTabletStream(fs, dir, tablet),
      );

      const leader = query.__;

      const leaderStream = new TransformStream({
        transform(state, controllerInner) {
          const record =
            leader && leader !== base ? state.record[leader] : state.record;

          // TODO account for nested leader
          // TODO account for a list of leader values
          if (record) {
            controllerInner.enqueue(record);
          }
        },
      });

      const schemaStream = [...streams, leaderStream].reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      await schemaStream.pipeTo(
        new WritableStream({
          async write(record) {
            controllerOuter.enqueue(record);
          },
        }),
      );
    },
  });
}

/**
 * This returns a list of records
 * @name selectRecord
 * @function
 * @returns {Object[]}
 */
export async function selectRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  // TODO find base value if _ is object or array
  // TODO exit if no base field or invalid base value
  const base = queries[0]._;

  const selectStream = await selectRecordStream({ fs, dir });

  const records = [];

  await ReadableStream.from(queries)
    .pipeThrough(selectStream)
    .pipeTo(
      new WritableStream({
        write(record) {
          records.push(record);
        },
      }),
    );

  return records;
}

/**
 * This returns a list with schema record
 * @name selectSchema
 * @function
 * @returns {Object[]}
 */
export async function selectSchema({ fs, dir }) {
  return selectRecord({ fs, dir, query: { _: "_" } });
}
