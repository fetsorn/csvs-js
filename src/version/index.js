import path from "path";
import csv from "papaparse";
import { isEmpty, chunksToLines } from "../stream.js";

export async function selectVersion({
  fs,
  bare = true,
  dir,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  const filepath = path.join(csvsdir, ".csvs.csv");

  const lineStream = (await isEmpty(fs, filepath))
    ? ReadableStream.from([])
    : chunksToLines(fs.createReadStream(filepath));

  let entry = { _: "." };

  for await (const line of lineStream) {
    if (line === "") continue;

    const {
      data: [[trunk, leaf]],
    } = csv.parse(line, { delimiter: "," });

    entry[trunk] = leaf;
  }

  return entry;
}

export async function updateVersion({
  fs,
  bare = true,
  dir,
  query,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  const filepath = path.join(csvsdir, ".csvs.csv");

  await fs.promises.writeFile(filepath, "");

  const entries = Object.entries(query)
    .filter(([key]) => key !== "_")
    .sort();

  for (const [key, value] of entries) {
    const line = csv.unparse([[key, value]], {
      delimiter: ",",
      newline: "\n",
    });

    await fs.promises.appendFile(filepath, line + "\n");
  }
}
