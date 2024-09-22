import path from "path";
import { parseLine } from "./line.js";

export function updateTablet(fs, dir, relations, filename) {
  // createReadStream
  const filepath = path.join(dir, filename);

  const contents = fs.readFileSync(filepath) ?? "";

  // TODO replace with file stream
  const lines = contents.split("\n");

  // TODO createWriteStream to tmp, rename tmp to origin
  let output = [];

  // transform
  for (const line of lines) {
    const state = parseLine(relations, line);

    // append line to output
    if (state.lines !== undefined) {
      output = output.concat(state.lines);
    }
  }

  const state = parseLine(relations, undefined);

  if (state.lines !== undefined) {
    output = output.concat(state.lines);
  }

  const contentsNew = output.sort().join("\n");

  if (contentsNew !== "") {
    const contentsNewline = `${contentsNew}\n`;

    fs.writeFileSync(filepath, contentsNewline);
  }
}
