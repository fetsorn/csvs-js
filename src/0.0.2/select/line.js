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
  // if (tablet.filename === "filepath-moddate.csv")
  //   console.log(
  //     "line",
  //     tablet.filename,
  //     "\n",
  //     line,
  //     "\n",
  //     JSON.stringify(state, undefined, 2),
  //   );

  // if end of file, and tablet is eager, ask to push matched if exists
  if (line === undefined)
    return {
      previous: tablet.eager ? state.matched : state.current,
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

  const traitIsNew = state.trait !== undefined && state.trait !== trait;

  const resetState = tablet.eager && traitIsNew;

  // if trait is new, move matched to previous for pushing
  const previous = resetState ? state.matched : undefined;

  // if trait is new, reset record for query
  const record = resetState ? state.initial : state.current;

  const { isMatch, record: current } = step(tablet, record, trait, thing);

  // if matched, copy current to matched
  const matched = isMatch ? current : undefined;

  const stateNew = { ...state, previous, current, matched, trait };

  // if (tablet.filename === "filepath-moddate.csv")
  //   console.log(
  //     "line end",
  //     tablet.filename,
  //     "\n",
  //     line,
  //     "\n",
  //     JSON.stringify(stateNew, undefined, 2),
  //   );

  return stateNew;
}
