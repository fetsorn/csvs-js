import path from "path";
import csv from "papaparse";
import { isEmpty, chunksToLines } from "../stream.js";
import { toSchema } from "../schema.js";

export async function selectSchema({ fs, dir }) {
  const filepath = path.join(dir, "_-_.csv");

  const lineStream = (await isEmpty(fs, filepath))
    ? ReadableStream.from([])
    : chunksToLines(fs.createReadStream(filepath));

  let entry = { _: "_" };

  for await (const line of lineStream) {
    if (line === "") continue;

    const {
      data: [[trunk, leaf]],
    } = csv.parse(line, { delimiter: "," });

    const leaves = entry[trunk];

    const leavesNew = leaves === undefined ? [leaf] : [leaves, leaf].flat();

    entry[trunk] = leavesNew;
  }

  return entry;
}

export async function buildSchema({ fs, dir }) {
  const schemaRecord = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  return schema;
}

export async function updateSchema({ fs, dir, query }) {
  const filepath = path.join(dir, "_-_.csv");

  // TODO add validation

  await fs.promises.writeFile(filepath, "");

  let lines = [];

  Object.entries(query)
    .filter(([key]) => key !== "_")
    .sort()
    .forEach(([trunk, leafValue]) => {
      const leaves = Array.isArray(leafValue) ? leafValue : [leafValue];

      leaves.sort().forEach((leaf) => {
        const line = csv.unparse([[trunk, leaf]], {
          delimiter: ",",
          newline: "\n",
        });

        lines.push(line + "\n");
      });
    });

  for (const line of lines) {
    await fs.promises.appendFile(filepath, line);
  }
}
