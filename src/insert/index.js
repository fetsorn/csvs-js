import { sortFile } from "../stream.js";
import { selectSchema } from "../select/index.js";
import { toSchema } from "../schema.js";
import { planInsert } from "./strategy.js";
import { insertTablet } from "./tablet.js";

export async function insertRecord({ fs, dir, query }) {
    const queries = Array.isArray(query) ? query : [query];

    const [schemaRecord] = await selectSchema({ fs, dir });

    const schema = toSchema(schemaRecord);

    for (const query of queries) {

        const strategy = planInsert(schema, query);

        for (const tablet of strategy) {
            await insertTablet(fs, dir, tablet, query);

            await sortFile(fs, dir, tablet.filename);
        }
    }

}
