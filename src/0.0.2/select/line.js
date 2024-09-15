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
  console.log("line", state, line);
  // ignore empty newline
  if (line === "") return state;

  const {
    data: [row],
  } = csv.parse(line);

  const [fst, snd] = row;

  const trait = tablet.traitIsFirst ? fst : snd;

  const thing = tablet.thingIsFirst ? fst : snd;

  // iterate

  return step(tablet, state, trait, thing);

  // let stateIntermediary = state;

  // // iterate over slices of state.record
  // for (const [key, value] of Object.entries(state.record)) {
  //   if (key === "_") continue;
  //   // TODO rewrite to arbitrary nesting depth
  //   if (typeof value === "object") {
  //     let stateObject = value;

  //     for (const [key1, value1] of Object.entries(value)) {
  //       const stateStep = { ...stateIntermediary, record: value1 };

  //       // call step here to get the record
  //       const { next, ...stateNew } = step(
  //         stateStep,
  //         tablet,
  //         key1,
  //         value1,
  //         trait,
  //         thing,
  //       );

  //       if (next) {
  //         stateObject = { ...stateObject, [key1]: stateNew.record };
  //       }
  //     }

  //     stateIntermediary = {
  //       ...stateIntermediary,
  //       record: { ...stateIntermediary.record, [key]: stateObject },
  //     };
  //   }

  //   const stateStep = { ...stateIntermediary, record: value };

  //   // call step here to get the record
  //   const { next, ...stateNew } = step(
  //     stateStep,
  //     tablet,
  //     key,
  //     value,
  //     trait,
  //     thing,
  //   );

  //   if (next) {
  //     stateIntermediary = {
  //       ...stateIntermediary,
  //       record: { ...stateIntermediary.record, [key]: stateNew.record },
  //     };
  //   }
  // }

  // // decide whether to push previous record

  // return stateIntermediary;
}
