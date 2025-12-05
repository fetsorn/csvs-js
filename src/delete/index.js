import { selectSchema } from "../select/index.js";
import { toSchema } from "../schema.js";
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

    const [schemaRecord] = await selectSchema({ fs, dir });

    const schema = toSchema(schemaRecord);

    for (const query of queries) {
        const strategy = planPrune(schema, query);

        for (const tablet of strategy) {
            await pruneTablet(fs, dir, tablet);
        }
    }
}
