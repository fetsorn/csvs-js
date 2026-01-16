import path from "path";
import { buildSchema } from "../schema/index.js";
import { planPrune } from "./strategy.js";
import { pruneTablet } from "./tablet.js";

/**
 * This deletes the dataset record.
 * @name delete
 * @param {object} record - A dataset record.
 * @function
 */
export async function deleteRecord({
  fs,
  bare = false,
  dir,
  query,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  const schema = await buildSchema({ fs, bare, dir, csvsdir });

  for (const query of queries) {
    const strategy = planPrune(schema, query);

    for (const tablet of strategy) {
      await pruneTablet(fs, csvsdir, tablet);
    }
  }
}
