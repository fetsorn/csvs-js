import path from "path";
import csv from "papaparse";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { mow, sow } from "../record.js";

const start = Date.now();

function selectSchemaStream({ query }) {
  let state = {
    entry: { _: "_" },
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

function selectLineStream({ query, entry, matchMap, matchMapQuerying, source }, tablet) {
  // in a querying tablet, set initial entry to the base of the tablet
  // and preserve the received entry for sowing grains later
  // if tablet base is different from previous entry base
  // sow previous entry into the initial entry
  const entryInitial = entry === undefined || tablet.querying
        ? entry === undefined ? { _: tablet.base } : tablet.base === query._ ? { _: tablet.base } : sow({ _: tablet.base }, entry, tablet.base, entry._)
        : entry;

  const isValueTablet = !tablet.accumulating && !tablet.querying;

  // in a value tablet use entry as a query
  const doSwap = isValueTablet;

  const queryInitial = doSwap ? entryInitial : query

  let state = {
    query: queryInitial,
    entry: entryInitial,
    fst: undefined,
    isMatch: false,
    hasMatch: false,
    matchMap,
    matchMapQuerying,
  };

  // const logTablet = true;
  const logTablet = tablet.filename === "datum-filepath.csv";

  if (logTablet)
    console.log(
      Date.now() - start,
      "tablet",
      source,
      tablet,
      "\n",
      JSON.stringify(state, undefined, 2),
      state.matchMap,
    );

  // value tablets receive a matchMap from accumulating tablets
  // but don't need to do anything with it or with the accompanying entry
  const dropMatchMap = tablet.passthrough && matchMap !== undefined;

  if (dropMatchMap) {
    return new TransformStream({
      transform(line, controller) {
        // do nothing
      },
    });
  }

  // accumulating tablets find all values matched at least once across the dataset
  // to do this they track matches in a shared match map
  // when a new entry is found, it is sent forward without a matchMap
  // and each accumulating tablet forwards the entry as is
  // until the entry reaches non-accumulating value tablets
  // assume the entry is new because it has been checked against the match map upstream
  const forwardAccumulating = tablet.accumulating && matchMap === undefined;

  // TODO what if the thing branch changes
  // from one group of accumulating tablets to another
  // and will need to invalidate matchMap

  if (forwardAccumulating) {
    if (logTablet)
      console.log(
        Date.now() - start,
        "acc forward",
        source,
        tablet,
        "\n",
        JSON.stringify(state, undefined, 2),
        state.matchMap,
      );

    return new TransformStream({
      start(controller) {
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
        });
      },

      transform(line, controller) {
        // do nothing
      },
    });
  }

  return new TransformStream({
    async transform(line, controller) {
      // if (logTablet) console.log("head", tablet.filename, line, state);

      if (line === "") return;

      const {
        data: [[fst, snd]],
      } = csv.parse(line, { delimiter: "," });

      const fstIsNew = state.fst !== undefined && state.fst !== fst;

      state.fst = fst;

      const isComplete = state.isMatch;

      // only push here if tablet is eager
      // otherwise wait until the end of file, maybe other groups also match
      const isEndOfGroup = tablet.eager && fstIsNew;

      const pushEndOfGroup = isEndOfGroup && isComplete;

      if (pushEndOfGroup) {
        if (logTablet)
          console.log(
            Date.now() - start,
            "push match",
            source,
            tablet,
            "\n",
            JSON.stringify(state, undefined, 2),
            state.matchMap,
          );

        // don't push matchMap here because accumulating is not yet finished
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
        });

        state.entry = entryInitial;

        state.query = queryInitial;

        state.isMatch = false;
      }

      const trait = tablet.traitIsFirst ? fst : snd;

      const thing = tablet.thingIsFirst ? fst : snd;

      const grainNew = {
        _: tablet.trait,
        [tablet.trait]: trait,
        [tablet.thing]: thing,
      };

      const grains = mow(state.query, tablet.trait, tablet.thing);

      // console.log(grains);

      const grainsNew = grains
        .map((grain) => {
          const isMatchGrain = tablet.traitIsRegex
            ? new RegExp(grain[tablet.trait]).test(trait)
            : grain[tablet.trait] === trait;

          // TODO when querying also match literal trait from the query
          // otherwise always true
          const doDiff = tablet.querying && matchMapQuerying === undefined;

          // TODO should this address the entryInitial?
          //      right now the thing is dropped from entryInitial so that sow works below
          // TODO what if the thing is nested and can't be accessed at the top level?
          //      is that impossible due to sow in entryInitial?
          const isMatchQuerying = doDiff ? entry[tablet.thing] === thing : true;

          const isMatch = isMatchGrain && isMatchQuerying;
          // accumulating tablets find all values matched at least once across the dataset
          // check here if thing was matched before
          // this will always be true for non-accumulating maps so will be ignored
          // TODO will this fail when matchMap is undefined?
          const matchIsNew =
            state.matchMap === undefined ||
            state.matchMap.get(thing) === undefined;

          // TODO factor in matchIsnew in isMatch

          state.isMatch = state.isMatch ? state.isMatch : isMatch && matchIsNew;

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

      // console.log(grainsNew);

      state.entry = grainsNew.reduce(
        (withGrain, grain) => sow(withGrain, grain, tablet.trait, tablet.thing),
        state.entry,
      );

      // if (logTablet) console.log("tail", tablet.filename, line, state);
      if (tablet.querying) {
        // in querying tablet we should sow the grain into the query as well
        state.query = grainsNew.reduce(
          (withGrain, grain) => sow(withGrain, grain, tablet.trait, tablet.thing),
          state.query,
        )
      }

    },

    flush(controller) {
      const isComplete = state.isMatch;

      // we push at the end of non-eager tablet
      // because a non-eager tablet looks for all possible matches until end of file
      // and doesn't push earlier than the end
      // push if tablet wasn't eager or if eager matched
      const pushEnd = !tablet.eager || isComplete;

      // TODO querying tablet must drop trait from entry before pushing

      // TODO this pushes when has match but it has to push when the group is over
      // TODO check that the group is new in fstIsNew doesn't work for some reason
      if (isComplete) {
        if (logTablet)
          console.log(
            Date.now() - start,
            "push end",
            source,
            tablet,
            "\n",
            JSON.stringify(state, undefined, 2),
            state.matchMap,
          );

        // don't push matchMap here because accumulating is not yet finished
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
        });
      }

      // TODO the error right now is because in accumulating tablet
      // we send an entry in push end, and then we send it again in push map
      // right now whatever is passed in pushMap

      const isEmptyPassthrough = tablet.passthrough && state.hasMatch === false;

      // TODO pass matchMapQuerying at the end

      // after all records have been pushed for forwarding
      // push the matchMap so that other accumulating tablets
      // can search for new values
      if (tablet.accumulating) {
        if (logTablet)
          console.log(
            Date.now() - start,
            "acc push map",
            source,
            tablet,
            "\n",
            JSON.stringify(state, undefined, 2),
            state.matchMap,
          );

        controller.enqueue({
          query: state.query,
          entry: entryInitial,
          matchMap: state.matchMap,
          source: tablet.filename,
        });
      } else if (isEmptyPassthrough) {
        if (logTablet)
          console.log(
            Date.now() - start,
            "push through",
            source,
            tablet,
            "\n",
            JSON.stringify(state, undefined, 2),
            state.matchMap,
          );

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

export function selectTabletStream(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  const logTablet = false;
  // const logTablet = tablet.filename = "datum-actdate.csv";

  return new TransformStream({
    async transform(state, controller) {
      if (logTablet)
        console.log(
          Date.now() - start,
          "selectTabletStream",
          source,
          tablet,
          "\n",
          JSON.stringify(state, undefined, 2),
          state.matchMap,
        );

      const fileStream = (await isEmpty(fs, filepath))
        ? ReadableStream.from([""])
        : ReadableStream.from(fs.createReadStream(filepath));

      const isSchema = tablet.filename === "_-_.csv";

      const selectStream = isSchema
        ? selectSchemaStream(state)
        : selectLineStream(state, tablet);

      await fileStream
        .pipeThrough(createLineStream())
        .pipeThrough(selectStream)
        .pipeTo(
          new WritableStream({
            async write(state) {
              // console.log(
              //   Date.now() - start,
              //   "enqueue",
              //   tablet.filename,
              //   JSON.stringify(state, undefined, 2),
              //   state.matchMap,
              // );

              controller.enqueue(state);
            },
          }),
        );
    },
  });
}
