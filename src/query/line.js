import csv from "papaparse";
import { sow } from "../record.js";
import { unescapeNewline } from "../escape.js";

export function makeStateLine(
  stateInitial,
  stateOld,
  tablet,
  grains,
  trait,
  thing,
) {
  let state = { ...stateOld };

  const grainNew = {
    _: tablet.base,
    [tablet.trait]: trait,
    [tablet.thing]: thing,
  };

  const grainsNew = grains
    .map((grain) => {
      // if grain[tablet.trait] is undefined, regex is ""
      const isMatchGrain = tablet.traitIsRegex
        ? new RegExp(grain[tablet.trait]).test(trait)
        : grain[tablet.trait] === trait;

      // when querying also match literal trait from the query
      // otherwise always true
      const doDiff = stateInitial.thingQuerying !== undefined;

      const isMatchQuerying = doDiff
        ? stateInitial.thingQuerying === thing
        : true;

      const isMatch = isMatchGrain && isMatchQuerying;

      state.isMatch = state.isMatch ? state.isMatch : isMatch;

      if (state.isMatch) {
        state.thingQuerying = thing;
      }

      if (isMatch) {
        return grainNew;
      }

      return undefined;
    })
    .filter((grain) => grain !== undefined);

  state.entry = grainsNew.reduce((withGrain, grain) => {
    const bar = sow(withGrain, grain, tablet.trait, tablet.thing);

    return bar;
  }, state.entry);

  if (thing === stateInitial.thingQuerying) {
    // if previous querying tablet already matched thing
    // the trait in this record is likely to be the same
    // and might duplicate in the entry after sow
    // return ({
    //   _: tablet.trait,
    //   [tablet.thing]: thing,
    // })
    return state;
  }

  // in querying tablet we should sow the grain into the query as well
  state.query = grainsNew.reduce((withGrain, grain) => {
    const bar = sow(withGrain, grain, tablet.trait, tablet.thing);

    return bar;
  }, state.query);

  return state;
}

export function queryLine(tablet, grains, stateInitial, state, line) {
  if (line === "") return state;

  const {
    data: [[fstEscaped, sndEscaped]],
  } = csv.parse(line, { delimiter: "," });

  const fst = unescapeNewline(fstEscaped);

  const snd = unescapeNewline(sndEscaped);

  const fstIsNew = state.fst === undefined || state.fst !== fst;

  state.fst = fst;

  const pushEndOfGroup = fstIsNew && state.isMatch;

  if (pushEndOfGroup) {
    const stateToPush = {
      entry: state.entry,
      query: state.query,
      thingQuerying: state.thingQuerying,
    };

    state.last = stateToPush;

    state.entry = stateInitial.entry;

    state.query = stateInitial.query;

    state.isMatch = false;
  }

  const trait = tablet.traitIsFirst ? fst : snd;

  const thing = tablet.thingIsFirst ? fst : snd;

  return makeStateLine(stateInitial, state, tablet, grains, trait, thing);
}
