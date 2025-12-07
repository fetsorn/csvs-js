import { ReadableStream } from "@swimburger/isomorphic-streams";
import { planQuery } from "./strategy.js";
import { buildSchema } from "../schema/index.js";
import { queryTabletStream } from "./tablet.js";

async function queryRecordStream({ fs, dir, query }) {
  const schema = await buildSchema({ fs, dir });

  const strategy = planQuery(schema, query);

  let state = { query };

  let iteratorMap = new Map();

  async function initIterator(counter) {
    const tabletStream = await queryTabletStream(
      fs,
      dir,
      strategy[counter],
      state,
    );

    const tabletIterator = tabletStream[Symbol.asyncIterator]();

    iteratorMap.set(counter, tabletIterator);
  }

  let strategyCounter = 0;

  async function pullTablet() {
    while (true) {
      if (iteratorMap.get(strategyCounter) === undefined) {
        await initIterator(strategyCounter);
      }

      const iterator = iteratorMap.get(strategyCounter);

      const { done, value } = await iterator.next();

      if (!done) {
        state = value;
      }

      const isFirstTablet = strategyCounter === 0;

      const isLastTablet = strategyCounter === strategy.length - 1;

      if (isFirstTablet) {
        if (done) {
          // if first tablet is over, close stream
          return null;
        } else {
          if (isLastTablet) {
            // if only one tablet, yield value
            return value;
          }
        }
      } else if (isLastTablet) {
        if (done) {
          // if last tablet is over, unset and start over
          // should be unreachable if only one tablet
          iteratorMap.set(strategyCounter, undefined);

          strategyCounter = 0;

          continue;
        } else {
          // if last tablet matches, yield value
          strategyCounter = 0;

          return value;
        }
      }

      // if a middle tablet is over, unset and pass state to the next
      if (done) {
        iteratorMap.set(strategyCounter, undefined);
      }

      strategyCounter++;
    }
  }

  return new ReadableStream({
    async pull(controller) {
      const option = await pullTablet();

      if (option === null) {
        controller.close();
      } else {
        controller.enqueue(option.entry);
      }
    },
  });
}

export async function queryRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  let entries = [];

  for (const query of queries) {
    let entryStream = await queryRecordStream({ fs, dir, query });

    for await (const entry of entryStream) {
      entries.push(entry);
    }
  }

  return entries;
}
