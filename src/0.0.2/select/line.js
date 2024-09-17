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
  // console.log(
  //   "line",
  //   tablet.filename,
  //   "\n",
  //   line,
  //   "\n",
  //   JSON.stringify(state, undefined, 2),
  // );

  // if end of file, ask to push matched if exists
  if (line === undefined)
    return {
      previous: state.matched,
    };

  // ignore empty newline
  // treat two lines with the same trait separated by newline as not separated
  if (line === "") return state;

  const {
    data: [row],
  } = csv.parse(line);

  const [fst, snd] = row;

  const trait = tablet.traitIsFirst ? fst : snd;

  const thing = tablet.thingIsFirst ? fst : snd;

  const traitIsNew = state.trait === undefined || state.trait === trait;

  const stateNew = traitIsNew
    ? { ...state, trait: trait }
    : {
        initial: state.initial,
        current: state.initial,
        previous: state.matched,
        trait: trait,
      };

  return step(tablet, stateNew, trait, thing);
}
