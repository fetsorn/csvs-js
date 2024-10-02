import csv from "papaparse";

export function pruneLine(tablet, line) {
  if (line === "") return {};

  const {
    data: [[fst, snd]],
  } = csv.parse(line, { delimiter: "," });

  const trait = tablet.traitIsFirst ? fst : snd;

  const isMatch = trait === tablet.trait;

  return isMatch;
}
