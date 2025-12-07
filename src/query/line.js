import csv from "papaparse";
import { mow, sow } from "../record.js";
import { unescape } from "../escape.js";

export function makeStateInitial(
  { query, entry, thingQuerying },
  tablet,
) {
  // in a querying tablet, set initial entry to the base of the tablet
  // and preserve the received entry for sowing grains later
  // if tablet base is different from previous entry base
  // sow previous entry into the initial entry
  const isSameBase = tablet.base === query._;

  const doDiscard = entry === undefined || isSameBase;

  const entryFallback = doDiscard ? { _: tablet.base } : entry;

  const doSow = !doDiscard;

  const entryInitial = doSow
    ? sow(
        { _: tablet.base },
        { _: entry._, [entry._]: entry[entry._] },
        tablet.base,
        entry._,
      )
    : entryFallback;

  const entryBaseChanged = entry === undefined || entry._ !== entryInitial._;

  // if entry base changed forget thingQuerying
  const thingQueryingInitial = entryBaseChanged ? undefined : thingQuerying;

  const queryInitial = query;

  const state = {
    entry: entryInitial,
    query: queryInitial,
    fst: undefined,
    isMatch: false,
    thingQuerying: thingQueryingInitial,
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

    if (tablet.thing === tablet.base) {
    } else {
        state.entry = grainsNew.reduce((withGrain, grain) => {
            const bar = sow(withGrain, grain, tablet.trait, tablet.thing);

            return bar;
        }, state.entry);
    }

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

    if (tablet.thing !== tablet.base) {
        // in querying tablet we should sow the grain into the query as well
        state.query = grainsNew.reduce(
            (withGrain, grain) => sow(withGrain, grain, tablet.trait, tablet.thing),
            state.query,
        );
    }

  return state;
}

export function selectLineStream(
  { query, entry, thingQuerying },
  tablet,
) {
  const stateInitial = makeStateInitial(
    {
      entry,
      query,
      thingQuerying,
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

      const pushEndOfGroup = fstIsNew && state.isMatch;

      if (pushEndOfGroup) {
        const stateToPush = {
          entry: state.entry,
          query: state.query,
          thingQuerying: state.thingQuerying,
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

      if (isComplete) {
        const stateToPush = {
          query: state.query,
          entry: state.entry,
          thingQuerying: state.thingQuerying,
        };

        controller.enqueue(stateToPush);
      }
    },
  });
}
