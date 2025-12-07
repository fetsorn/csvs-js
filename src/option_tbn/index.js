import { ReadableStream } from "@swimburger/isomorphic-streams";
import { buildSchema } from "../schema/index.js";
import { planSelect } from "./strategy.js";
import { optionTabletStream } from "./tablet.js";

async function selectOptionStream({ fs, dir, query }) {
    const schema = await buildSchema({ fs, dir });

    const strategy = planSelect(schema, query)[Symbol.iterator]();

    let tabletIterator;

    let tabletsOver = false;

    let state = { query, matchMap: new Map() };

    async function nextTablet() {
        const { done, value } = await strategy.next();

        if (done) {
            tabletsOver = true;

            return;
        }

        const tabletStream = await optionTabletStream(fs, dir, value, state);

        tabletIterator = tabletStream[Symbol.asyncIterator]();
    }

    async function pullTablet() {
        if (tabletIterator === undefined) await nextTablet();

        const { done, value } = await tabletIterator.next();

        if (done) {
            await nextTablet();

            if (tabletsOver) {
                return null;
            }

            return pullTablet();
        }

        return value;
    }

    return new ReadableStream({
        async pull(controller) {
            const option = await pullTablet();

            if (option === null) {
                controller.close();
            } else {
                controller.enqueue(option.entry);
            }
        }
    });
}

export async function selectOption({ fs, dir, query }) {
    // exit if record is undefined
    if (query === undefined) return;

    const queries = Array.isArray(query) ? query : [query];

    let entries = [];

    for (const query of queries) {
        let optionStream = await selectOptionStream({ fs, dir, query });

        for await (const option of optionStream) {
            entries.push(option);
        }
    }

    return entries;
}
