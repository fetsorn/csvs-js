import csv from "papaparse";
import { mow, sow } from "../record.js";
import { unescape } from "../escape.js";

export function makeStateInitial(
  { query, entry, matchMap, source },
  tablet,
) {
  const doDiscard = entry === undefined;

  const entryFallback = doDiscard ? { _: tablet.base } : entry;

  const entryInitial = entryFallback;

  const entryBaseChanged = entry === undefined || entry._ !== entryInitial._;

  const queryInitial = entryInitial;

  const state = {
    entry: entryInitial,
    query: queryInitial,
    fst: undefined,
    isMatch: false,
    hasMatch: false,
    matchMap,
  };

  return state;
}

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
    _: tablet.trait,
    [tablet.trait]: trait,
    [tablet.thing]: thing,
  };

  const grainsNew = grains
    .map((grain) => {

      // if grain[tablet.trait] is undefined, regex is ""
      const isMatch = tablet.traitIsRegex
        ? new RegExp(grain[tablet.trait]).test(trait)
        : grain[tablet.trait] === trait;

      // accumulating tablets find all values
      // matched at least once across the dataset
      // check here if thing was matched before
      // this will always be true for non-accumulating maps
      // so will be ignored
      const matchIsNew =
        state.matchMap === undefined || state.matchMap.get(thing) === undefined;

      state.isMatch = state.isMatch ? state.isMatch : isMatch && matchIsNew;

      if (isMatch && matchIsNew) {
        state.matchMap.set(thing, true);
      }

      state.hasMatch = state.hasMatch ? state.hasMatch : state.isMatch;

      if (isMatch && matchIsNew) {
        return grainNew;
      }

      return undefined;
    })
    .filter((grain) => grain !== undefined);

  state.entry = grainsNew.reduce((withGrain, grain) => {
    const bar = sow(withGrain, grain, tablet.trait, tablet.thing);

    return bar;
  }, state.entry);

  return state;
}

export function parseLineStream(
  { query, entry, matchMap, source },
  tablet,
) {
  const stateInitial = makeStateInitial(
    {
      entry,
      query,
      matchMap,
      source,
    },
    tablet,
  );

  let state = { ...stateInitial };

  const grains = mow(state.query, tablet.trait, tablet.thing);

  return new TransformStream({
    async transform(line, controller) {
      if (line === "") return;

      const {
        data: [[fstEscaped, sndEscaped]],
      } = csv.parse(line, { delimiter: "," });

      const fst = unescape(fstEscaped);

      const snd = unescape(sndEscaped);

      const fstIsNew = state.fst !== undefined && state.fst !== fst;

      state.fst = fst;

      const isComplete = state.isMatch;

      // only push here if tablet is eager
      // otherwise wait until the end of file,
      // maybe other groups also match
      const isEndOfGroup = tablet.eager && fstIsNew;

      const pushEndOfGroup = isEndOfGroup && isComplete;

      if (pushEndOfGroup) {
        // don't push matchMap here
        // because accumulating is not yet finished
        const stateToPush = {
          entry: state.entry,
          query: state.query,
          source: tablet.filename,
        };

        controller.enqueue(stateToPush);

        state.entry = stateInitial.entry;

        state.query = stateInitial.query;

        state.isMatch = false;
      }

      const trait = tablet.traitIsFirst ? fst : snd;

      const thing = tablet.thingIsFirst ? fst : snd;

      state = makeStateLine(stateInitial, state, tablet, grains, trait, thing);
    },

    flush(controller) {
      const isComplete = state.isMatch;

      // we push at the end of non-eager tablet
      // because a non-eager tablet looks
      // for all possible matches until end of file
      // and doesn't push earlier than the end
      // push if tablet wasn't eager or if eager matched
      const pushEnd = !tablet.eager || isComplete;

      if (isComplete) {
        // don't push matchMap here
        // because accumulating is not yet finished
        const stateToPush = {
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
        };

        controller.enqueue(stateToPush);
      }

      // after all records have been pushed for forwarding
      // push the matchMap so that other accumulating tablets
      // can search for new values
        // in accumulating by trunk this pushes entryInitial
        // to output and yields extra search result
        const stateToPush = {
          query: state.query,
          entry: stateInitial.entry,
          matchMap: state.matchMap,
          source: tablet.filename,
        };

        controller.enqueue(stateToPush);
    },
  });
}

export function selectLineStream(state, tablet) {
  // accumulating tablets find all values
  // matched at least once across the dataset
  // to do this they track matches in a shared match map
  // when a new entry is found, it is sent forward without a matchMap
  // and each accumulating tablet forwards the entry as is
  // until the entry reaches non-accumulating value tablets
  // assume the entry is new
  // because it has been checked against the match map upstream
  const forwardAccumulating = state.matchMap === undefined;

  // TODO what if the thing branch changes
  // from one group of accumulating tablets to another
  // and will need to invalidate matchMap

  if (forwardAccumulating) {
    return new TransformStream({
      start(controller) {
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
        });
      },

      transform(state, controller) {
        // do nothing
      },
    });
  }

  return parseLineStream(state, tablet);
}
