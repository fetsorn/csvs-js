import {
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import path from "path";
import { parseLine } from "./line.js";
import { isEmpty, createLineStream } from "../stream.js";

const start = Date.now();

/**
 *
 * @name selectTabletStream
 * @function
 * @param {object} fs
 * @param {string} dir
 * @param {object} tablet
 * @returns {Transform}
 */
export function selectTabletStream(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(state, controller) {
      // if (tablet.filename === "export1_tag-export1_channel.csv")
      // console.log(
      //   Date.now() - start,
      //   "tablet",
      //   tablet,
      //   "\n",
      //   JSON.stringify(state.query ?? state.record, undefined, 2),
      // );

      // how do I decide here if I want to make record.query a record?
      // maybe it should be in the tablets?
      // after accumulating I _don't_ want to turn record.query into a record

      if (tablet.accumulating && state.record) {
        // console.log(
        //   Date.now() - start,
        //   "acc forward",
        //   tablet,
        //   "\n",
        //   JSON.stringify(state.record, undefined, 2),
        // );

        // assume the record is new because it has been checked against stream map upstream
        controller.enqueue({ record: state.record });

        return;
      }

      if (tablet.accumulating && state.query === undefined) {
        return;
      }

      // value tablets drop query and require a record
      if (!tablet.accumulating && tablet.querying === undefined && state.record === undefined) {
        return;
      }

      // this will stream state after file reader streams
      let stateIntermediary = tablet.accumulating
          ? { initial: state.query, current: state.query }
          : {
        initial: state.query ?? state.record,
        current: state.query ?? state.record,
      };

      let matchMap = state.map ?? new Map();

      let hasMatch = false;

      const fileStream = (await isEmpty(fs, filepath))
        ? ReadableStream.from([""])
        : ReadableStream.from(fs.createReadStream(filepath));

      const lineStream = await fileStream.pipeThrough(createLineStream());

      // for loop because there's no async reduce
      // this will stream transform after file reader streams
      for await (const line of lineStream) {
        stateIntermediary = parseLine(stateIntermediary, tablet, line);

        if (stateIntermediary.complete) {
          // if (tablet.filename === "export1_tag-export1_channel.csv")
          // console.log(
          //   Date.now() - start,
          //   "push match",
          //   tablet.filename,
          //   tablet,
          //   JSON.stringify(stateIntermediary.complete, undefined, 2),
          // );

          if (tablet.accumulating) {
            const value = stateIntermediary.complete[tablet.thing];

            const newMatch = matchMap.get(value) === undefined;

            if (newMatch) {
              // console.log(
              //   Date.now() - start,
              //   "acc push match",
              //   tablet.filename,
              //   tablet,
              //   JSON.stringify(stateIntermediary.complete, undefined, 2),
              // );

              controller.enqueue({ record: stateIntermediary.complete });

              matchMap.set(value, true);
            }
          } else {
            controller.enqueue({ record: stateIntermediary.complete });

            hasMatch = true;
          }

          delete stateIntermediary.complete;
        }
      }

      const { [tablet.trait]: omitted, ...completeWithoutTrait } = stateIntermediary.current;

      const complete = tablet.querying ? completeWithoutTrait : stateIntermediary.current;

      // push if tablet wasn't eager or if eager matched
      const pushEnd = !tablet.eager || stateIntermediary.isMatch;

      // if tablet is eager and has been pushing, ask to push matched
      // if tablet is not eager and so hasn't pushed anything yet, push current
      // this will stream final after file reader streams
      stateIntermediary = pushEnd ? { complete } : {};

      if (stateIntermediary.complete) {
        // if (tablet.filename === "export1_tag-export1_channel.csv")
        // console.log(
        //   Date.now() - start,
        //   "push end",
        //   tablet.filename,
        //   tablet,
        //   JSON.stringify(stateIntermediary.complete, undefined, 2),
        // );

        if (tablet.accumulating) {
          // assume that thing is base level leaf
          const value = stateIntermediary.complete[tablet.thing];

          const newMatch = matchMap.get(value) === undefined;

          if (newMatch) {
            controller.enqueue({ record: stateIntermediary.complete });

            matchMap.set(value, true);
          }
        } else {
          controller.enqueue({ record: stateIntermediary.complete });

          hasMatch = true;
        }
      }

      if (tablet.accumulating) {
        // push query forward for other accumulating streams to process it
        // along with the match map to avoid pushing the same thing twice
        // console.log(
        //   Date.now() - start,
        //   "acc push map",
        //   tablet.filename,
        //   matchMap,
        //   JSON.stringify(state.query, undefined, 2),
        // );

        controller.enqueue({ query: state.query, map: matchMap });
      } else if (hasMatch === false && tablet.passthrough) {
        // if no match and tablet is not a filter, push initial record
        // if (tablet.filename === "export1_tag-export1_channel.csv")
        // console.log(
        //   Date.now() - start,
        //   "push through",
        //   tablet.filename,
        //   tablet,
        //   JSON.stringify(state.record, undefined, 2),
        // );

        controller.enqueue({ record: state.query ?? state.record });
      }
    },
  });
}
