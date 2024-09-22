import { pruneLine } from "./line.js";

export function pruneTablet(tablet, cache, appendOutput) {
  const lines = cache[tablet.filename].split("\n");

  for (const line of lines) {
    const isMatch = pruneLine(tablet, line);

    if (!isMatch) {
      appendOutput(tablet.filename, line);
    }
  }
}
