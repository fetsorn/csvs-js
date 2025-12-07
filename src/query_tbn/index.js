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
        const tabletStream = await queryTabletStream(fs, dir, strategy[counter], state);

        const tabletIterator = tabletStream[Symbol.asyncIterator]();

        iteratorMap.set(counter, tabletIterator);
    }

    let tabletsOver = false;

    let strategyCounter = 0;

    async function pullTablet() {
        while (true) {
            const isFirstTablet = strategyCounter === 0;

            if (iteratorMap.get(strategyCounter) === undefined) {
                await initIterator(strategyCounter);
            }

            const iterator = iteratorMap.get(strategyCounter);

            const { done, value } = await iterator.next();

            state = value;

            const isLastTablet = strategyCounter === (strategy.length - 1);

            if (done) {
                if (isFirstTablet) {
                    // if first tablet is over, close stream
                    return null
                } else if (isLastTablet) {
                    // unreachable if only one tablet
                    iteratorMap.set(strategyCounter, undefined);
                    // if last tablet is over, start over
                    strategyCounter = 0;
                } else {
                    iteratorMap.set(strategyCounter, undefined);
                    // otherwise pass state to the next tablet
                    strategyCounter++;
                }
            }

            if (isLastTablet) {
                return value
            }
        }
    }

    return new ReadableStream({
        async pull(controller) {
            const option = await pullTablet();

            if (option === null) {
                controller.close()
            } else {
                controller.enqueue(option.entry)
            }
        }
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
