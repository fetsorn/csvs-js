import { buildSchema } from "../schema/index.js";
import { planPrune } from "./strategy.js";
import { pruneTablet } from "./tablet.js";

/**
 * This deletes the dataset record.
 * @name delete
 * @param {object} record - A dataset record.
 * @function
 */
export async function deleteRecord({ fs, dir, query }) {
    // exit if record is undefined
    if (query === undefined) return;

    const queries = Array.isArray(query) ? query : [query];

    const schema = await buildSchema({ fs, dir });

    for (const query of queries) {
        const strategy = planPrune(schema, query);

        for (const tablet of strategy) {
            await pruneTablet(fs, dir, tablet);
        }
    }
}
