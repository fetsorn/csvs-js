import path from "path";
import { planBuild } from "./strategy.js";
import { buildTablet } from "./tablet.js";
import { buildSchema } from "../schema/index.js";

/**
 * This returns a list of records
 * @name selectRecord
 * @function
 * @returns {Object[]}
 */
export async function buildRecord({
  fs,
  bare = false,
  dir,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
  query,
}) {
  const schema = await buildSchema({ fs, bare, dir, csvsdir });

  const strategy = planBuild(schema, query[0]);

  let entry = query[0];

  for (const tablet of strategy) {
    entry = await buildTablet(fs, csvsdir, tablet, entry);
  }

  // if nothing is found, return input unchanged

  return entry;
}
