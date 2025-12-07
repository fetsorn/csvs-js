import csv from "papaparse";
import { sow } from "../record.js";
import { unescape } from "../escape.js";

export function optionLine(tablet, state, line) {
  if (line === "") return;

  const {
    data: [[fstEscaped, sndEscaped]],
  } = csv.parse(line, { delimiter: "," });

  const fst = unescape(fstEscaped);

  const snd = unescape(sndEscaped);

  // if fst is new, last group has ended
  const fstIsNew = state.fst !== undefined && state.fst !== fst;

  state.fst = fst;

  const pushEndOfGroup = fstIsNew && state.isMatch;

  if (pushEndOfGroup) {
    // don't push matchMap here
    // because accumulating is not yet finished
    state.last = { entry: state.entry };

    state.entry = { _: tablet.base };

    state.isMatch = false;
  }

  const base = tablet.thingIsFirst ? fst : snd;

  const grainNew = {
    _: tablet.base,
    [tablet.base]: base,
  };

  // accumulating tablets find all values
  // matched at least once across the dataset
  // check here if thing was matched before
  const matchIsNew =
    state.matchMap === undefined || state.matchMap.get(base) === undefined;

  state.isMatch = state.isMatch ? state.isMatch : matchIsNew;

  if (matchIsNew) {
    state.matchMap.set(base, true);

    state.entry = sow(state.entry, grainNew, tablet.base, tablet.base);
  }

  return state;
}
