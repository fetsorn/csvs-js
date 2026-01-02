import csv from "papaparse";
import { sow } from "../record.js";
import { unescapeNewline } from "../escape.js";

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

  // if previous group of keys ended
  // move current state to "last"
  // and reset to initial state
  if (pushEndOfGroup) {
    const stateToPush = {
      entry: state.entry,
      query: state.query,
      thingQuerying: state.thingQuerying,
    };

    state.last = stateToPush;

    state.entry = { ...stateInitial.entry };

    state.query = { ...stateInitial.query };

    state.isMatch = false;
  }

  const trait = tablet.traitIsFirst ? fst : snd;

  const thing = tablet.thingIsFirst ? fst : snd;

  // this represents the current line
  // and will be sown into entry
  // if any of query grains match it
  const grainNew = {
    _: tablet.base,
    [tablet.trait]: trait,
    [tablet.thing]: thing,
  };

  // all grains need to match
  const isMatchGrains = grains.reduce((withGrain, grain) => {
    const isMatchGrain = tablet.traitIsRegex
      ? new RegExp(grain[tablet.trait]).test(trait)
      : grain[tablet.trait] === trait;

    const bothMatch =
      withGrain === undefined ? isMatchGrain : withGrain && isMatchGrain;

    return bothMatch;
  }, undefined);

  // NOTE: what the hell is thingQuerying?
  // it's kind of like telling next level of nesting
  // about what is currently being searched for

  // when querying also match literal trait from the query
  // otherwise always true
  const doDiff = stateInitial.thingQuerying !== undefined;

  const isMatchQuerying = doDiff ? stateInitial.thingQuerying === thing : true;

  const isMatch = isMatchGrains && isMatchQuerying;

  // when does state's isMatch overlap with current?
  state.isMatch = state.isMatch ? state.isMatch : isMatch;

  if (state.isMatch) {
    state.thingQuerying = thing;
  }

  if (isMatch) {
    state.entry = sow(state.entry, grainNew, tablet.trait, tablet.thing);

    state.query = sow(state.query, grainNew, tablet.trait, tablet.thing);
  }

  return state;
}
