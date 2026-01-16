import path from "path";
import csv from "papaparse";
import { isEmpty, chunksToLines } from "../stream.js";
import { toSchema } from "../schema.js";

export async function selectSchema({
  fs,
  bare = false,
  dir,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  const filepath = path.join(csvsdir, "_-_.csv");

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

export async function buildSchema({
  fs,
  bare = false,
  dir,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  console.log(bare, dir, csvsdir);
  const schemaRecord = await selectSchema({ fs, bare, dir, csvsdir });

  const schema = toSchema(schemaRecord);

  return schema;
}

export async function updateSchema({
  fs,
  bare = false,
  dir,
  query,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  const filepath = path.join(csvsdir, "_-_.csv");

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
