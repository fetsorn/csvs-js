import csv from "papaparse";
import { step } from "./step.js";

export function updateLine(state, line) {
  if (line === undefined) {
    const stateNew = step(state.relations, state.fst, undefined);

    return stateNew;
  }

  if (line === "") return {};

  const {
    data: [[fst, snd]],
  } = csv.parse(line);

  const fstIsNew = state.fst !== fst;

  const insert = fstIsNew;

  const { relations: relationsNew, lines: insertPartial } = insert
    ? step(state.relations, state.fst, fst)
    : { relations: state.relations, lines: [] };

  const keys = Object.keys(relationsNew);

  const isMatch = keys.includes(fst);

  const matchPartial = isMatch
    ? []
    : [csv.unparse([[fst, snd]], { newline: "\n" })];

  const linesNew = [...insertPartial, ...matchPartial];

  const stateNew = { lines: linesNew, relations: relationsNew, fst, isMatch };

  return stateNew;
}
