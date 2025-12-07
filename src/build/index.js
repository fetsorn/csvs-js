import { planBuild } from "./strategy.js";
import { buildTablet } from "./tablet.js";
import { buildSchema } from "../schema/index.js";

/**
 * This returns a list of records
 * @name selectRecord
 * @function
 * @returns {Object[]}
 */
export async function buildRecord({ fs, dir, query }) {
  const schema = await buildSchema({ fs, dir });

  const strategy = planBuild(schema, query[0]);

  let state = { entry: query[0] };

  for (const tablet of strategy) {
    state = await buildTablet(fs, dir, tablet, state);
  }

  return state.entry;
}
