import csv from "papaparse";
import { unescapeNewline } from "../escape.js";

export function pruneLine(tablet, line) {
  const {
    data: [[fstEscaped, sndEscaped]],
  } = csv.parse(line, { delimiter: "," });

  const fst = unescapeNewline(fstEscaped);

  const snd = unescapeNewline(sndEscaped);

  const trait = tablet.traitIsFirst ? fst : snd;

  const isMatch = line !== "" && trait === tablet.trait;

  return isMatch;
}
