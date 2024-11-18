import csv from "papaparse";
import { step } from "./step.js";

/**
 * This updates the dataset record.
 * @name updateLine
 * @function
 * @param {object} state - .
 * @param {object} tablet - .
 * @param {string} line - .
 * @returns {object} - a slice record.
 */
export function updateLine(state, tablet, line) {
  if (tablet.filename === 'datum-actdate.csv')
    console.log("updateLine", state, line);

  if (line === "") return {};

  const {
    data: [[fst, snd]],
  } = csv.parse(line, { delimiter: "," });

  const fstIsNew = state.fst !== fst;

  const doInsert = fstIsNew;

  // if no match, enqueue original relation
  // if match, don't enqueue original relation
  // if match, enqueue new relations
  // const { isMatch, record: current } = step(tablet, record, state.fst, fst);

  const isMatch = false;

  const recordLine = {
    _: tablet.trunk,
    [tablet.trunk]: fst,
    [tablet.branch]: snd
  };

  const record = isMatch ? recordLine : {};

  const stateNew = { fst, fstIsNew, line };

  return stateNew;
}
