import csv from "papaparse";
import { mow, sow } from "../record.js";
import { unescape } from "../escape.js";

export function makeStateInitial(
  { matchMap, source },
  tablet,
) {
  const entryInitial = { _: tablet.base };

  const state = {
    entry: entryInitial,
    fst: undefined,
    isMatch: false,
    matchMap,
  };

  return state;
}

export function makeStateLine(
  stateOld,
  tablet,
  trait,
  thing,
) {
    let state = { ...stateOld };

    // accumulating tablets find all values
    // matched at least once across the dataset
    // check here if thing was matched before
    const matchIsNew =
          state.matchMap === undefined || state.matchMap.get(thing) === undefined;

    state.isMatch = state.isMatch ? state.isMatch : matchIsNew;

    if (matchIsNew) {
        state.matchMap.set(thing, true);
    }

    if (matchIsNew) {
        state.entry = {
            _: tablet.trait,
            [tablet.trait]: trait,
            [tablet.thing]: thing,
        };
    }

  return state;
}

export function parseLineStream(
  { matchMap, source },
  tablet,
) {
  const stateInitial = makeStateInitial(
    {
      matchMap,
      source,
    },
    tablet,
  );

  let state = { ...stateInitial };

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

      const isEndOfGroup = fstIsNew;

      const pushEndOfGroup = isEndOfGroup && isComplete;

      if (pushEndOfGroup) {
        // don't push matchMap here
        // because accumulating is not yet finished
        const stateToPush = {
          entry: state.entry,
          source: tablet.filename,
        };

        controller.enqueue(stateToPush);

        state.entry = stateInitial.entry;

        state.isMatch = false;
      }

      const trait = tablet.traitIsFirst ? fst : snd;

      const thing = tablet.thingIsFirst ? fst : snd;

        state = makeStateLine(state, tablet, [state.entry], trait, thing);
    },

    flush(controller) {
      const isComplete = state.isMatch;

      if (isComplete) {
        // don't push matchMap here
        // because accumulating is not yet finished
        const stateToPush = {
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
