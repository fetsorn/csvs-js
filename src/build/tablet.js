import csv from "papaparse";
import path from "path";
import { unescape } from "../escape.js";
import { mow, sow } from "../record.js";
import { isEmpty, chunksToLines } from "../stream.js";

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
      const isMatch = grain[tablet.trait] === trait;

      state.isMatch = state.isMatch ? state.isMatch : isMatch;

      state.hasMatch = state.hasMatch ? state.hasMatch : state.isMatch;

      if (isMatch) {
        return grainNew;
      }

      return undefined;
    })
    .filter((grain) => grain !== undefined);

  state.entry = grainsNew.reduce((withGrain, grain) => {
    return sow(withGrain, grain, tablet.trait, tablet.thing);
  }, state.entry);

  return state;
}

export async function buildTablet(fs, dir, tablet, { entry, source }) {
    const filepath = path.join(dir, tablet.filename);

    const lineStream = await isEmpty(fs, filepath) ? [] : chunksToLines(fs.createReadStream(filepath));

    const stateInitial = {
        entry,
        fst: undefined,
        isMatch: false,
        hasMatch: false,
    };

    let state = { ...stateInitial };

    const grains = mow(state.entry, tablet.trait, tablet.thing);

    for await (const line of lineStream) {
      if (line === "") continue;

      const {
        data: [[fstEscaped, sndEscaped]],
      } = csv.parse(line, { delimiter: "," });

      const fst = unescape(fstEscaped);

      const snd = unescape(sndEscaped);

      const fstIsNew = state.fst !== undefined && state.fst !== fst;

      state.fst = fst;

      const isComplete = state.isMatch;

      const isEndOfGroup = tablet.eager && fstIsNew;

      const pushEndOfGroup = isEndOfGroup && isComplete;

        if (pushEndOfGroup) {
            const stateToPush = {
                entry: state.entry,
                source: tablet.filename,
            };

            return stateToPush
        }

        const trait = tablet.traitIsFirst ? fst : snd;

        const thing = tablet.thingIsFirst ? fst : snd;

        state = makeStateLine(stateInitial, state, tablet, grains, trait, thing);
    }

    const isComplete = state.isMatch;

    if (isComplete) {
        // don't push matchMap here
        // because accumulating is not yet finished
        const stateToPush = {
          entry: state.entry,
          source: tablet.filename,
        };

        return stateToPush
    }

    const isEmptyPassthrough = tablet.passthrough && state.hasMatch === false;

    if (isEmptyPassthrough) {
        // if no match and tablet is not a filter
        // push initial record to the next passthrough value tablet
        const stateToPush = {
            entry: state.entry,
            source: tablet.filename,
        };

        return stateToPush;
    }

    // should be unreachable
    return undefined
}
