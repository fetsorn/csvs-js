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
  // if (tablet.filename === "export1_tag-export1_channel.csv")
  //   console.log(
  //     "line",
  //     tablet.filename,
  //     "\n",
  //     line,
  //     "\n",
  //     JSON.stringify(state, undefined, 2),
  //   );

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

  // TODO rename
  const stateOld = traitIsNew
    ? { ...state, trait: trait }
    : {
        initial: state.initial,
        current: state.initial,
        previous: state.matched,
        trait: trait,
      };

  const { isMatch, record: current } = step(
    tablet,
    stateOld.current,
    trait,
    thing,
  );

  const matched = isMatch ? current : undefined;

  const stateNew = { ...stateOld, matched, current };

  return stateNew;
}
