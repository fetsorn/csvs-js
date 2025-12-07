import csv from "papaparse";
import { sow } from "../record.js";
import { unescape } from "../escape.js";

export function selectLineStream(
    { query, entry, matchMap },
  tablet,
) {
  const stateInitial = {
    entry: { _: query._ },
    fst: undefined,
    isMatch: false,
    matchMap,
  };

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

      // only push here if tablet is eager
      // otherwise wait until the end of file,
      // maybe other groups also match
      const isEndOfGroup = tablet.eager && fstIsNew;

      const pushEndOfGroup = isEndOfGroup && isComplete;

      if (pushEndOfGroup) {
        // don't push matchMap here
        // because accumulating is not yet finished
        const stateToPush = { entry: state.entry };

        controller.enqueue(stateToPush);

        state.entry = { _: query._ };

        state.isMatch = false;
      }

      const thing = tablet.thingIsFirst ? fst : snd;

      const trait = tablet.traitIsFirst ? fst : snd;

        const grainNew = {
            _: tablet.trait,
            [tablet.trait]: trait,
            [tablet.thing]: thing,
        };

        // accumulating tablets find all values
        // matched at least once across the dataset
        // check here if thing was matched before
        const matchIsNew =
              state.matchMap === undefined || state.matchMap.get(thing) === undefined;

        state.isMatch = state.isMatch ? state.isMatch : matchIsNew;

        if (matchIsNew) {
            state.matchMap.set(thing, true);

            state.entry = sow(state.entry, grainNew, tablet.trait, tablet.thing);
        }
    },

    flush(controller) {
      const isComplete = state.isMatch;

      if (isComplete) {
        // don't push matchMap here
        // because accumulating is not yet finished
        const stateToPush = {
          entry: state.entry,
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
        };

        controller.enqueue(stateToPush);
    },
  });
}
