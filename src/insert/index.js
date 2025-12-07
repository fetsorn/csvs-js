import { sortFile } from "../stream.js";
import { buildSchema } from "../schema/index.js";
import { planInsert } from "./strategy.js";
import { insertTablet } from "./tablet.js";

export async function insertRecord({ fs, dir, query }) {
  const queries = Array.isArray(query) ? query : [query];

  const schema = await buildSchema({ fs, dir });

  for (const query of queries) {
    const strategy = planInsert(schema, query);

    for (const tablet of strategy) {
      await insertTablet(fs, dir, tablet, query);

      await sortFile(fs, dir, tablet.filename);
    }
  }
}
