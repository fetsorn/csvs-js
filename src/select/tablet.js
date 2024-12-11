import path from "path";
import csv from "papaparse";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { mow, sow } from "../record.js";

export function step(tablet, query, entry, trait, thing) {
  const grains = mow(query, tablet.trait, tablet.thing);

  const grainNew = {
    _: tablet.trait,
    [tablet.trait]: trait,
    [tablet.thing]: thing,
  };

  const { isMatch, grains: grainsNew } = grains.reduce(
    (withGrain, grain) => {
      const isMatch = tablet.traitIsRegex
        ? new RegExp(grain[tablet.trait]).test(trait)
        : grain[tablet.trait] === trait;

      const isMatchPartial = {
        isMatch: withGrain.isMatch ? withGrain.isMatch : isMatch,
      };

      const grainPartial = {
        grains: isMatch ? [...withGrain.grains, grainNew] : withGrain.grains,
      };

      return { ...isMatchPartial, ...grainPartial };
    },
    { isMatch: false, grains: [] },
  );

  const entryNew = grainsNew.reduce(
    (withGrain, grain) => sow(withGrain, grain, tablet.trait, tablet.thing),
    entry,
  );

  return { isMatch, entry: entryNew };
}

function selectSchemaStream(query, entry) {
  let state = {
    entry: entry,
  };

  return new TransformStream({
    async transform(line, controller) {
      if (line === "") return;

      const {
        data: [[trunk, leaf]],
      } = csv.parse(line, { delimiter: "," });

      const leaves = state.entry[trunk];

      const leavesNew = leaves === undefined ? [leaf] : [leaves, leaf].flat();

      state.entry = {
        ...state.entry,
        [trunk]: leavesNew,
      };
    },

    flush(controller) {
      controller.enqueue({ query, entry: state.entry });
    },
  });
}

function selectLineStream(query, entry, tablet) {
  let state = {
    entry: entry,
    fst: undefined,
    isMatch: false,
  };

  return new TransformStream({
    async transform(line, controller) {
      if (line === "") return;

      const {
        data: [[fst, snd]],
      } = csv.parse(line, { delimiter: "," });

      const fstIsNew = state.fst !== undefined && state.fst !== fst;

      state.fst = fst;

      if (fstIsNew && state.isMatch) {
        controller.enqueue({ query, entry: state.entry });

        state.entry = entry;
      }

      const trait = tablet.traitIsFirst ? fst : snd;

      const thing = tablet.thingIsFirst ? fst : snd;

      const { isMatch, entry: entryNew } = step(
        tablet,
        query,
        state.entry,
        trait,
        thing,
      );

      state.entry = entryNew;

      state.isMatch = isMatch;
    },

    flush(controller) {
      if (state.isMatch) {
        controller.enqueue({ query, entry: state.entry });
      }
    },
  });
}

export function selectTabletStream(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(state, controller) {
      const fileStream = (await isEmpty(fs, filepath))
        ? ReadableStream.from([""])
        : ReadableStream.from(fs.createReadStream(filepath));

      const isSchema = tablet.filename === "_-_.csv";

      const selectStream = isSchema
        ? selectSchemaStream(state.query, state.entry)
        : selectLineStream(state.query, state.entry, tablet);

      const enqueueStream = new WritableStream({
        async write(state) {
          controller.enqueue(state);
        },
      });

      await fileStream
        .pipeThrough(createLineStream())
        .pipeThrough(selectStream)
        .pipeTo(enqueueStream);
    },
  });
}
