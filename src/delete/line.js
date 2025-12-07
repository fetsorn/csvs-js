import csv from "papaparse";
import { unescape } from "../escape.js";

export function pruneLine(tablet, line) {
  const {
    data: [[fstEscaped, sndEscaped]],
  } = csv.parse(line, { delimiter: "," });

  const fst = unescape(fstEscaped);

  const snd = unescape(sndEscaped);

  const trait = tablet.traitIsFirst ? fst : snd;

  const isMatch = line !== "" && trait === tablet.trait;

  return isMatch;
}
