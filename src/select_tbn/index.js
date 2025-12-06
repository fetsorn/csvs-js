import { queryRecord } from "../query_tbn/index.js";
import { selectOption } from "../option_tbn/index.js";
import { buildRecord } from "../build/index.js";

export async function selectRecord({ fs, dir, query }) {
    // exit if record is undefined
    if (query === undefined) return;

    const queries = Array.isArray(query) ? query : [query];

    let entries = [];

    for (const query of queries) {
        const hasLeaves = Object.entries(query).length > 1;

        // decide whether we want option or query
        const options = hasLeaves
              ? await queryRecord({ fs, dir, query })
              : await selectOption({ fs, dir, query });

        // rewrite to a ReadableStream
        for (const option of options) {
            const record = await buildRecord({ fs, dir, query: [option] })

            entries.push(record);
        }
    }

    return entries
}
