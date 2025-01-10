import csv from "papaparse";
import { mow, sow } from "../record.js";

export function makeStateInitial({
  query,
  entry,
  matchMap,
  thingQuerying,
  source
}, tablet) {
  // in a querying tablet, set initial entry to the base of the tablet
  // and preserve the received entry for sowing grains later
  // if tablet base is different from previous entry base
  // sow previous entry into the initial entry
  const isSameBase = tablet.querying && tablet.base === query._

  const doDiscard = entry === undefined || isSameBase;

  const entryFallback = doDiscard
        ? { _: tablet.base }
        : entry;

  const doSow = tablet.querying && !doDiscard;

  const entryInitial = doSow
        ? sow({ _: tablet.base }, entry, tablet.base, entry._)
        : entryFallback;

  const entryBaseChanged = entry === undefined || entry._ !== entryInitial._;

  // if entry base changed forget thingQuerying
  const thingQueryingInitial = entryBaseChanged ? undefined : thingQuerying;

  const isValueTablet = !tablet.accumulating && !tablet.querying;

  const isAccumulatingByTrunk = tablet.accumulating && !tablet.thingIsFirst;

  // in a value tablet use entry as a query
  const doSwap = isValueTablet || isAccumulatingByTrunk;

  const queryInitial = doSwap ? entryInitial : query;

  const state = {
    query: queryInitial,
    entry: entryInitial,
    fst: undefined,
    isMatch: false,
    hasMatch: false,
    matchMap,
    thingQuerying: thingQueryingInitial,
  };

  return state
}

export function makeStateLine(
  stateInitial,
  stateOld,
  tablet,
  grains,
  trait,
  thing
) {
  let state = { ...stateOld };

  const grainNew = {
    _: tablet.trait,
    [tablet.trait]: trait,
    [tablet.thing]: thing,
  };

  const grainsNew = grains
        .map((grain) => {
          const isMatchGrain = tablet.traitIsRegex
                ? new RegExp(grain[tablet.trait]).test(trait)
                : grain[tablet.trait] === trait;

          // when querying also match literal trait from the query
          // otherwise always true
          const doDiff = tablet.querying && stateInitial.thingQuerying !== undefined;

          const isMatchQuerying = doDiff ? stateInitial.thingQuerying === thing : true;

          const isMatch = isMatchGrain && isMatchQuerying;

          // accumulating tablets find all values
          // matched at least once across the dataset
          // check here if thing was matched before
          // this will always be true for non-accumulating maps
          // so will be ignored
          const matchIsNew =
                state.matchMap === undefined ||
                state.matchMap.get(thing) === undefined;

          state.isMatch = state.isMatch ? state.isMatch : isMatch && matchIsNew;

          if (tablet.querying && state.isMatch) {
            state.thingQuerying = thing;
          }

          if (isMatch && matchIsNew && tablet.accumulating) {
            state.matchMap.set(thing, true);
          }

          state.hasMatch = state.hasMatch ? state.hasMatch : state.isMatch;

          if (isMatch && matchIsNew) {
            return grainNew;
          }

          return undefined;
        })
        .filter(Boolean);

  state.entry = grainsNew.reduce(
    (withGrain, grain) => sow(
      withGrain,
      grain,
      tablet.trait,
      tablet.thing
    ),
    state.entry,
  );

  if (tablet.querying) {
    if (thing === stateInitial.thingQuerying) {
      // if previous querying tablet already matched thing
      // the trait in this record is likely to be the same
      // and might duplicate in the entry after sow
      // return ({
      //   _: tablet.trait,
      //   [tablet.thing]: thing,
      // })
      return state
    }

    // in querying tablet we should sow the grain into the query as well
    state.query = grainsNew.reduce(
      (withGrain, grain) => sow(
        withGrain,
        grain,
        tablet.trait,
        tablet.thing
      ),
      state.query,
    )
  }

  return state
}

export function parseLineStream({
  query,
  entry,
  matchMap,
  thingQuerying,
  source
}, tablet) {
  const stateInitial = makeStateInitial({
    query,
    entry,
    matchMap,
    thingQuerying,
    source
  }, tablet);

  let state = { ...stateInitial };

  const grains = mow(state.query, tablet.trait, tablet.thing);

  return new TransformStream({
    async transform(line, controller) {
      if (line === "") return;

      const {
        data: [[fst, snd]],
      } = csv.parse(line, { delimiter: "," });

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
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
          thingQuerying: state.thingQuerying,
        });

        state.entry = stateInitial.entry;

        state.query = stateInitial.query;

        state.isMatch = false;
      }

      const trait = tablet.traitIsFirst ? fst : snd;

      const thing = tablet.thingIsFirst ? fst : snd;

      state = makeStateLine(
        stateInitial,
        state,
        tablet,
        grains,
        trait,
        thing
      );
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
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
          thingQuerying: state.thingQuerying,
        });
      }

      const isEmptyPassthrough = tablet.passthrough && state.hasMatch === false;

      // after all records have been pushed for forwarding
      // push the matchMap so that other accumulating tablets
      // can search for new values
      if (tablet.accumulating) {
        // in accumulating by trunk this pushes entryInitial
        // to output and yields extra search result
        controller.enqueue({
          query: state.query,
          entry: stateInitial.entry,
          matchMap: state.matchMap,
          source: tablet.filename,
        });
      } else if (isEmptyPassthrough) {
        // if no match and tablet is not a filter
        // push initial record to the next passthrough value tablet
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
        });
      }
    },
  });
}

export function selectLineStream(state, tablet) {
  // value tablets receive a matchMap from accumulating tablets
  // but don't need to do anything with it or with the accompanying entry
  const dropMatchMap = tablet.passthrough && state.matchMap !== undefined;

  if (dropMatchMap) {
    return new TransformStream({
      transform(state, controller) {
        // do nothing
      },
    });
  }

  // accumulating tablets find all values
  // matched at least once across the dataset
  // to do this they track matches in a shared match map
  // when a new entry is found, it is sent forward without a matchMap
  // and each accumulating tablet forwards the entry as is
  // until the entry reaches non-accumulating value tablets
  // assume the entry is new
  // because it has been checked against the match map upstream
  const forwardAccumulating = tablet.accumulating && state.matchMap === undefined;

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
