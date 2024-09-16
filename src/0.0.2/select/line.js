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
  if (line === "") return state;

  const {
    data: [row],
  } = csv.parse(line);

  const [fst, snd] = row;

  const trait = tablet.traitIsFirst ? fst : snd;

  const thing = tablet.thingIsFirst ? fst : snd;

  if (state.trait !== undefined && state.trait !== trait)
    console.log("setting new state", state.trait, trait);

  const stateNew =
    state.trait === undefined || state.trait === trait
      ? { ...state, trait: trait }
      : {
          ...state,
          current: state.initial,
          previous: state.matched,
          trait: trait,
        };

  return step(tablet, stateNew, trait, thing);
}
