import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from "@swimburger/isomorphic-streams";
import { toSchema } from "../schema.js";
import { planBuild } from "./strategy.js";
import { buildTablet } from "./tablet.js";
import { selectSchema } from "../select/index.js";

/**
 * This returns a list of records
 * @name selectRecord
 * @function
 * @returns {Object[]}
 */
export async function buildRecord({ fs, dir, query }) {
    const [schemaRecord] = await selectSchema({ fs, dir });

    const schema = toSchema(schemaRecord);

    const strategy = planBuild(schema, query[0]);

    let state = { entry: query[0] };

    for (const tablet of strategy) {
        state = await buildTablet(fs, dir, tablet, state);
    }

    return state.entry;
}
