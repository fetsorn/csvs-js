import csv from "papaparse";
import { unescape } from "../escape.js";

// returns keys to insert
export function updateLine(state, line) {
  let keysInserted = [];

  let {
    data: [[fstEscaped, snd]],
  } = csv.parse(line, { delimiter: "," });

  const fst = unescape(fstEscaped);

  const fstIsNew = state.fst === undefined || state.fst !== fst;

  // if previous isMatch and fstIsNew
  if (state.isMatch && fstIsNew) {
    keysInserted.push(state.fst);
  }

  if (fstIsNew) {
    // insert and forget all record keys between previous and next
    const keysBetween = state.keys.filter((key) => {
      const isAfter =
        state.fst === undefined || state.fst.localeCompare(key) < 1;

      const isBefore = key.localeCompare(fst) === -1;

      const isBetween = isAfter && isBefore;

      return isBetween;
    });

    for (const key of keysBetween) {
      keysInserted.push(key);
    }
  }

  // match this fst against all keys
  const isMatch = state.keys.includes(fst);

  return { fst, isMatch, keysInserted, keys: state.keys };
}
