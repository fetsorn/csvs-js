import csv from "papaparse";
import { step } from "./step.js";

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

  // ignore empty newline
  // treat two lines with the same fst separated by newline as not separated
  if (line === "") return state;

  const {
    data: [[fst, snd]],
  } = csv.parse(line, { delimiter: "," });

  const trait = tablet.traitIsFirst ? fst : snd;

  const thing = tablet.thingIsFirst ? fst : snd;

  // assume that tablet is sorted and fst will never repeat again
  const fstIsNew = state.fst !== undefined && state.fst !== fst;

  // inside a group of fst, snd is also sorted and won't repeat
  // const sndIsNew = state.snd !== undefined && state.snd !== snd;

  const pushEager = tablet.eager && fstIsNew;

  const isComplete = pushEager && state.isMatch;

  // TODO does this fail when record doesn't have the trait?
  const { [tablet.trait]: omitted, ...completeWithoutTrait } = state.current;

  const complete = tablet.querying ? completeWithoutTrait : state.current;

  // if fst is new, move matched to complete for pushing
  const completePartial = isComplete ? { complete } : {};

  // if fst is new, reset record for query
  const entry = pushEager ? state.initial : state.current;

  const { isMatch, entry: current } = step(
    tablet,
    state.query,
    entry,
    trait,
    thing,
  );

  // remember previous isMatch inside a group of fst
  const isMatchNew =
    tablet.eager && !fstIsNew && state.isMatch ? state.isMatch : isMatch;

  const stateNew = {
    initial: state.initial,
    query: state.query,
    ...completePartial,
    current,
    fst,
    isMatch: isMatchNew,
  };

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
