import path from "path";
import { sortFile } from "../stream.js";
import { buildSchema } from "../schema/index.js";
import { planInsert } from "./strategy.js";
import { insertTablet } from "./tablet.js";
import { extractProse, writeProse, parseLang } from "../prose/index.js";

export async function insertRecord({
  fs,
  bare = false,
  dir,
  query,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
  schema: schemaCached,
}) {
  const queries = Array.isArray(query) ? query : [query];

  const schema = schemaCached ?? await buildSchema({ fs, bare, dir, csvsdir });

  for (const q of queries) {
    const { proseEntries, stripped } = extractProse(q);

    // Write prose blobs for all entries (top-level and nested)
    for (const { value, key, content } of proseEntries) {
      if (value !== undefined) {
        await writeProse(fs, csvsdir, value, parseLang(key), content);
      }
    }

    const strategy = planInsert(schema, stripped);

    for (const tablet of strategy) {
      await insertTablet(fs, csvsdir, tablet, stripped);

      await sortFile(fs, csvsdir, tablet.filename);
    }
  }
}
