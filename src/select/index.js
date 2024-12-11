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
    async transform(query, controller) {
      // there can be only one root base in search query
      // TODO: validate against arrays of multiple bases, do not return [], throw error
      const base = query._;

      // if no base is provided, return empty
      if (base === undefined) return undefined;

      // check schema inside the transform to skip it when query is schema
      const isSchema = base === "_";

      const schema = isSchema
        ? undefined
        : toSchema((await selectSchema({ fs, dir }))[0]);

      // TODO should rewrite to remove matchMap from here
      // we need to pass matchMap here
      // because accumulating tablets depend on whether it is defined or not
      const queryStream = ReadableStream.from([
        { query, matchMap: new Map() }]);

      const strategy = planSelect(schema, query);

      const streams = strategy.map((tablet) =>
        selectTabletStream(fs, dir, tablet),
      );

      const leaderStream = new TransformStream({
        async transform(state, controllerLeader) {
          console.log("leader stream", state, base)
          //// TODO should we set base to query in accumulating by trunk?
          const baseNew = state.entry._ !== base
                ? base
                : state.entry._;

          // if query has __, return leader
          // TODO what if leader is nested? what if many leaders? use mow
          const entryNew = query.__ !== undefined
                ? state.query[query.__]
                : {
            ...state.entry,
            _: baseNew
          }

          // do not return search result
          // if state comes from the end of accumulating
          if (state.matchMap === undefined) {
            controllerLeader.enqueue({ entry: entryNew });
          }
        }
      });

      const selectStream = [...streams, leaderStream].reduce(
        (withStream, stream) => withStream.pipeThrough(stream),
        queryStream,
      );

      await selectStream.pipeTo(
        new WritableStream({
          async write(state) {
            controller.enqueue(state.entry);
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

  const entries = [];

  await ReadableStream.from(queries)
    .pipeThrough(selectStream)
    .pipeTo(
      new WritableStream({
        write(entry) {
          entries.push(entry);
        },
      }),
    );

  return entries;
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
