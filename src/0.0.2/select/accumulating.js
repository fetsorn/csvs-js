import stream from "stream";
import { parseLine } from "./line.js";

/**
 * This returns an array of streams that read tablets.
 * @name shell
 * @function
 * @param {object} query
 * @returns {Object[]}
 */
export function parseTabletAccumulating(cache, tablet) {
  // TODO replace with file stream
  const lines = cache[tablet.filename].split("\n");

  return new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      // console.log(
      //   "tablet acc",
      //   tablet,
      //   "\n",
      //   lines,
      //   "\n",
      //   JSON.stringify(state.record, undefined, 2),
      // );

      // forward the record if it hasn't been pushed yet
      if (state.record) {
        // console.log(
        //   "tablet forward",
        //   tablet,
        //   "\n",
        //   JSON.stringify(state.record, undefined, 2),
        // );
        // assume the record is new because it has been checked against stream map upstream
        this.push({ record: state.record });

        callback();

        return;
      }

      if (state.query === undefined) {
        callback();

        return;
      }

      // this will stream state after file reader streams
      let stateIntermediary = { initial: state.query, current: state.query };
      let matchMap = state.map ?? new Map();

      // this will stream transform after file reader streams
      for (const line of lines) {
        stateIntermediary = parseLine(stateIntermediary, tablet, line);

        if (stateIntermediary.previous) {
          // assume that thing is base level leaf
          const value = stateIntermediary.previous[tablet.thing];

          const newMatch = matchMap.get(value) === undefined;

          if (newMatch) {
            // console.log(
            //   "push",
            //   tablet.filename,
            //   tablet,
            //   JSON.stringify(stateIntermediary.previous, undefined, 2),
            // );

            this.push({ record: stateIntermediary.previous });

            matchMap.set(value, true);
          }

          stateIntermediary.previous = undefined;
        }
      }

      // this will stream final after file reader streams
      stateIntermediary = parseLine(stateIntermediary, tablet, undefined);

      if (stateIntermediary.previous) {
        // assume that thing is base level leaf
        const value = stateIntermediary.previous[tablet.thing];

        const newMatch = matchMap.get(value) === undefined;

        if (newMatch) {
          // console.log(
          //   "push",
          //   tablet.filename,
          //   tablet,
          //   JSON.stringify(stateIntermediary.previous, undefined, 2),
          // );

          this.push({ record: stateIntermediary.previous });

          matchMap.set(value, true);
        }
      }

      // push query forward for other accumulating streams to process it
      // along with the match map to avoid pushing the same thing twice
      // console.log(
      //   "push map",
      //   tablet.filename,
      //   matchMap,
      //   JSON.stringify(state.query, undefined, 2),
      // );

      this.push({ query: state.query, map: matchMap });

      callback();
    },
  });
}
