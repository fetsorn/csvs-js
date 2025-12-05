import { selectSchema } from "../select/index.js";
import { toSchema } from "../schema.js";
import { planUpdate } from "./strategy.js";
import { updateTablet } from "./tablet.js";

export async function updateRecord({ fs, dir, query }) {
    const queries = Array.isArray(query) ? query : [query];

    const [schemaRecord] = await selectSchema({ fs, dir });

    const schema = toSchema(schemaRecord);

    for (const query of queries) {
        const strategy = planUpdate(schema, query);

        for (const tablet of strategy) {
            await updateTablet(fs, dir, tablet, query);
        }
    }
}
