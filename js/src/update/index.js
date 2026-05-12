import path from "path";
import { buildSchema } from "../schema/index.js";
import { sortFile } from "../stream.js";
import { planUpdate } from "./strategy.js";
import { updateTablet } from "./tablet.js";
import { updateSchema } from "../schema/index.js";
import { updateVersion } from "../version/index.js";
import { extractProse, writeProse, parseLang } from "../prose/index.js";

export async function updateRecord({
  fs,
  bare = false,
  dir,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
  query,
  schema: schemaCached,
}) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  const schema = schemaCached ?? await buildSchema({ fs, bare, dir, csvsdir });

  for (const query of queries) {
    const isSchema = query._ === "_";

    if (isSchema) {
      await updateSchema({ fs, bare, dir, csvsdir, query });

      continue;
    }

    const isVersion = query._ === ".";

    if (isVersion) {
      await updateVersion({ fs, bare, dir, csvsdir, query });

      continue;
    }

    const { proseEntries, stripped } = extractProse(query);

    // Write prose blobs for all entries (top-level and nested)
    for (const { value, key, content } of proseEntries) {
      if (value !== undefined) {
        await writeProse(fs, csvsdir, value, parseLang(key), content);
      }
    }

    const strategy = planUpdate(schema, stripped);

    for (const tablet of strategy) {
      await updateTablet(fs, csvsdir, tablet, stripped);

      await sortFile(fs, csvsdir, tablet.filename);
    }
  }
}
