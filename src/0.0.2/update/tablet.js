import { parseLine } from "./line.js";

export function updateTablet(cache, relations, filename, appendOutput) {
  // createReadStream
  const lines = cache[filename].split("\n");

  // transform
  for (const line of lines) {
    const state = parseLine(relations, line);

    // append line to output
    // createWriteStream to tmp, rename tmp to origin
    if (state.lines !== undefined) {
      appendOutput(filename, state.lines);
    }
  }

  const state = parseLine(relations, undefined);

  if (state.lines !== undefined) {
    // createWriteStream to tmp, rename tmp to origin
    appendOutput(filename, state.lines);
  }
}
