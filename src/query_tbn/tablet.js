import path from "path";
import { ReadableStream } from "@swimburger/isomorphic-streams";
import { isEmpty, chunksToLines } from "../stream.js";
import { mow, sow } from "../record.js";
import { queryLine } from "./line.js";

export function makeStateInitial({ query, entry, thingQuerying }, tablet) {
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

export async function queryTabletStream(
  fs,
  dir,
  tablet,
  { query, entry, thingQuerying },
  first,
) {
  const filepath = path.join(dir, tablet.filename);

  const empty = await isEmpty(fs, filepath);

  let isDone = false;

  const lineStream = empty
    ? ReadableStream.from([])
    : chunksToLines(fs.createReadStream(filepath));

  const lineIterator = lineStream[Symbol.asyncIterator]();

  const stateInitial = makeStateInitial(
    { query, entry, thingQuerying },
    tablet,
  );

  let stateSaved = stateInitial;

  const grains = mow(stateSaved.query, tablet.trait, tablet.thing);

  async function pullLine(state) {
    if (isDone) {
      return { done: true, value: undefined };
    }

    // first tablet loves lines
    // empty file is the same as "no matches"
    // later tablet hates lines
    // empty file is the same as "matching all"
    if (!first && empty) {
      isDone = true;

      return {
        done: false,
        value: { last: { query, entry, thingQuerying } },
      };
    }

    const { done, value } = await lineIterator.next();

    if (done) {
      isDone = true;

      if (state.isMatch) {
        state.last = state;
      }

      return { done: false, value: state };
    }

    const stateLine = queryLine(tablet, grains, stateInitial, state, value);

    if (stateLine.last) {
      return { done: false, value: stateLine };
    } else {
      return pullLine(stateLine);
    }
  }

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await pullLine(stateSaved);

      if (done) {
        controller.close();
      }

      if (value.last) {
        controller.enqueue(value.last);

        value.last = false;
      }

      stateSaved = value;
    },
  });
}
