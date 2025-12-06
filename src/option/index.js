import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from "@swimburger/isomorphic-streams";
import { toSchema } from "../schema.js";
import { selectSchema } from "../select/index.js";
import { planSelect } from "./strategy.js";
import { selectTabletStream } from "./tablet.js";

function leaderStream(base, query) {
  return new TransformStream({
    async transform(state, controller) {
      // TODO should we set base to query in accumulating by trunk?
      const baseNew = state.entry._ !== base ? base : state.entry._;

      const entryNew = {
              ...state.entry,
              _: baseNew,
            };

      // do not return search result
      // if state comes from the end of accumulating
      if (state.matchMap === undefined) {
        controller.enqueue({ entry: entryNew });
      }
    },
  });
}

/**
 * This returns a Transform stream
 * @name selectRecordStream
 * @function
 * @returns {Transform}
 */
export function selectRecordStream({ fs, dir }) {
  return new TransformStream({
    async transform(query, controller) {
      // there can be only one root base in search query
      // TODO: validate against arrays of multiple bases,
      //       do not return [], throw error
      const base = query._;

      // if no base is provided, return empty
      if (base === undefined) return undefined;

      const schema = toSchema((await selectSchema({ fs, dir }))[0]);

      // if schema does not have base return empty
      if (schema !== undefined && schema[base] === undefined) return undefined;

      // TODO should rewrite to remove matchMap from here
      // we need to pass matchMap here
      // because accumulating tablets depend
      // on whether it is defined or not
      const queryStream = new ReadableStream({
        start(controller) {
          controller.enqueue({ query, matchMap: new Map() });

          controller.close();
        },
      });

      const strategy = planSelect(schema, query);

      const streams = strategy.map((tablet) =>
        selectTabletStream(fs, dir, tablet),
      );

      const selectStream = [...streams, leaderStream(base, query)].reduce(
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
export async function selectOption({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  const queryStream = new ReadableStream({
    start(controller) {
      for (const q of queries) {
        controller.enqueue(q);
      }

      controller.close();
    },
  });

  // TODO find base value if _ is object or array
  // TODO exit if no base field or invalid base value
  // const base = queries[0]._;

  const selectStream = selectRecordStream({ fs, dir });

  const entries = [];

  await queryStream.pipeThrough(selectStream).pipeTo(
    new WritableStream({
      write(entry) {
        entries.push(entry);
      },
    }),
  );

  return entries;
}
