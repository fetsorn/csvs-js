import { buildSchema } from "../schema/index.js";
import { planUpdate } from "./strategy.js";
import { updateTablet } from "./tablet.js";
import { updateSchema } from "../schema/index.js";
import { updateVersion } from "../version/index.js";

export async function updateRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  const schema = await buildSchema({ fs, dir });

  for (const query of queries) {
    const isSchema = query._ === "_";

    if (isSchema) {
      await updateSchema({ fs, dir, query });

      continue;
    }

    const isVersion = query._ === ".";

    if (isVersion) {
      await updateVersion({ fs, dir, query });

      continue;
    }

    const strategy = planUpdate(schema, query);

    for (const tablet of strategy) {
      await updateTablet(fs, dir, tablet, query);
    }
  }
}
