import path from "path";
import { sortFile } from "../stream.js";
import { buildSchema } from "../schema/index.js";
import { planInsert } from "./strategy.js";
import { insertTablet } from "./tablet.js";

export async function insertRecord({
  fs,
  bare = true,
  dir,
  query,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  const queries = Array.isArray(query) ? query : [query];

  const schema = await buildSchema({ fs, bare, dir, csvsdir });

  for (const query of queries) {
    const strategy = planInsert(schema, query);

    for (const tablet of strategy) {
      await insertTablet(fs, csvsdir, tablet, query);

      await sortFile(fs, csvsdir, tablet.filename);
    }
  }
}
