import path from "path";
import csv from "papaparse";
import { mow } from "../record.js";

export async function insertTablet(fs, dir, tablet, query) {
  const filepath = path.join(dir, tablet.filename);

  // filter out the { _: trunk, trunk: value }
  // which mow returns when there's no connections
  const grains = mow(query, tablet.trunk, tablet.branch).filter(
    (grain) => grain[tablet.branch] !== undefined,
  );

  const lines = grains.map(
    ({ [tablet.trunk]: key, [tablet.branch]: value }) => {
      const keyEscaped = escape(key);

      const valueEscaped = escape(value);

      return csv.unparse([[keyEscaped, valueEscaped]], {
        delimiter: ",",
        newline: "\n",
      });
    },
  );

  for (const line of lines) {
    await fs.promises.appendFile(filepath, line + "\n");
  }
}
