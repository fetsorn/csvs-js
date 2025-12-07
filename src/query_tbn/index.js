import { ReadableStream } from "@swimburger/isomorphic-streams";
import { planQuery } from "./strategy.js";
import { buildSchema } from "../schema/index.js";
import { queryTabletStream } from "./tablet.js";

async function queryRecordStream({ fs, dir, query }) {
  const schema = await buildSchema({ fs, dir });

  const strategy = planQuery(schema, query);

  let iteratorMap = new Map();

  let stateMap = new Map();

  let strategyCounter = 0;

  function getPreviousState(counter) {
    let resumed = stateMap.get(counter);

    if (resumed !== undefined) {
      return resumed;
    }

    if (counter === 0) return { query };

    return getPreviousState(counter - 1);
  }

  async function initIterator(counter) {
    let state = getPreviousState(counter);

    const isFirstTablet = counter === 0;

    const tabletStream = await queryTabletStream(
      fs,
      dir,
      strategy[counter],
      state,
      isFirstTablet,
    );

    const tabletIterator = tabletStream[Symbol.asyncIterator]();

    iteratorMap.set(counter, tabletIterator);
  }

  function stopIterator(counter) {
    iteratorMap.set(counter, undefined);

    stateMap.set(counter, undefined);
  }

  async function pullTablet() {
    while (true) {
      if (iteratorMap.get(strategyCounter) === undefined) {
        await initIterator(strategyCounter);
      }

      const iterator = iteratorMap.get(strategyCounter);

      const { done, value } = await iterator.next();

      if (!done) {
        const { last: omitted, ...stateNew } = value;

        stateMap.set(strategyCounter, stateNew);
      }

      const isFirstTablet = strategyCounter === 0;

      const isLastTablet = strategyCounter === strategy.length - 1;

      if (done) {
        if (isFirstTablet) {
          // if first tablet is over, close stream
          return null;
        } else {
          stopIterator(strategyCounter);

          strategyCounter--;

          continue;
        }
      } else {
        if (isLastTablet) {
          // if only one tablet, yield value
          return value;
        } else {
          strategyCounter++;

          continue;
        }
      }
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
