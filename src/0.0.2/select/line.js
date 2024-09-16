import csv from "papaparse";
import { step } from "./core/index.js";

/**
 *
 * @name core
 * @function
 * @param {object} query
 * @returns {Object[]}
 */
export function parseLine(state, tablet, line) {
  console.log(
    "line",
    tablet.filename,
    "\n",
    line,
    "\n",
    JSON.stringify(state, undefined, 2),
  );

  // ignore empty newline
  if (line === "") return { ...state, end: true };

  const {
    data: [row],
  } = csv.parse(line);

  const [fst, snd] = row;

  const trait = tablet.traitIsFirst ? fst : snd;

  const thing = tablet.thingIsFirst ? fst : snd;

  return step(tablet, state, trait, thing);
}
