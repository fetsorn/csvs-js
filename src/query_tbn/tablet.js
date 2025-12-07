import path from "path";
import { ReadableStream } from "@swimburger/isomorphic-streams";
import { isEmpty, chunksToLines } from "../stream.js";
import { mow, sow } from "../record.js";
import { queryLine } from "./line.js";

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

export async function queryTabletStream(fs, dir, tablet, { query, entry, thingQuerying }) {
    const filepath = path.join(dir, tablet.filename);

    const lineStream = await isEmpty(fs, filepath) ? ReadableStream.from([]) : chunksToLines(fs.createReadStream(filepath));

    const lineIterator = lineStream[Symbol.asyncIterator]();

    const stateInitial = makeStateInitial({ query, entry, thingQuerying }, tablet)

    let stateSaved = stateInitial;

    const grains = mow(stateSaved.query, tablet.trait, tablet.thing);

    async function pullLine(state) {
        const { done, value } = await lineIterator.next();

        if (done) {
            if (state.isMatch) {
                state.last = state;
            }

            return { done: true, value: state };
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

            if (value.last) {
                controller.enqueue(value.last);

                value.last = false;
            }

            if (done) {
                controller.close()
            }

            stateSaved = value;

        }
    })
}
