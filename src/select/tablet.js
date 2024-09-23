import path from "path";
import stream from "stream";
import { parseLine } from "./line.js";

/**
 * This returns an array of streams that read tablets.
 * @name shell
 * @function
 * @param {object} query
 * @returns {Object[]}
 */
export function parseTablet(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  const contents = fs.existsSync(filepath)
    ? fs.readFileSync(filepath, "utf8")
    : "";

  // TODO replace with file stream
  const lines = contents.split("\n");

  return new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      // if (tablet.filename === "export1_tag-export1_channel.csv")
      // console.log(
      //   "tablet",
      //   tablet,
      //   "\n",
      //   lines,
      //   "\n",
      //   JSON.stringify(state.query ?? state.record, undefined, 2),
      // );

      // how do I decide here if I want to make record.query a record?
      // maybe it should be in the tablets?
      // after accumulating I _don't_ want to turn record.query into a record

      // value tablets drop query and require a record
      if (tablet.querying === undefined && state.record === undefined) {
        callback();

        return;
      }

      // this will stream state after file reader streams
      let stateIntermediary = {
        initial: state.query ?? state.record,
        current: state.query ?? state.record,
      };

      let hasMatch = false;

      // this will stream transform after file reader streams
      for (const line of lines) {
        stateIntermediary = parseLine(stateIntermediary, tablet, line);

        if (stateIntermediary.complete) {
          // if (tablet.filename === "export1_tag-export1_channel.csv")
          //   console.log(
          //     "push",
          //     tablet.filename,
          //     tablet,
          //     JSON.stringify(stateIntermediary.complete, undefined, 2),
          //   );
          this.push({ record: stateIntermediary.complete });

          hasMatch = true;

          delete stateIntermediary.complete;
        }
      }

      // this will stream final after file reader streams
      stateIntermediary = parseLine(stateIntermediary, tablet, undefined);

      if (stateIntermediary.complete) {
        // if (tablet.filename === "export1_tag-export1_channel.csv")
        //   console.log(
        //     "push",
        //     tablet.filename,
        //     tablet,
        //     JSON.stringify(stateIntermediary.complete, undefined, 2),
        //   );
        this.push({ record: stateIntermediary.complete });

        hasMatch = true;
      }

      // if no match and tablet is not a filter, push initial record
      if (hasMatch === false && tablet.passthrough) {
        // if (tablet.filename === "export1_tag-export1_channel.csv")
        //   console.log(
        //     "push",
        //     tablet.filename,
        //     tablet,
        //     JSON.stringify(state.record, undefined, 2),
        //   );
        this.push({ record: state.query ?? state.record });
      }

      callback();
    },
  });
}

/**
 * This returns an array of streams that read tablets.
 * @name shell
 * @function
 * @param {object} query
 * @returns {Object[]}
 */
export function parseTabletAccumulating(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  const contents = fs.existsSync(filepath)
    ? fs.readFileSync(filepath, "utf8")
    : "";

  // TODO replace with file stream
  const lines = contents.split("\n");

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

        if (stateIntermediary.complete) {
          // assume that thing is base level leaf
          const value = stateIntermediary.complete[tablet.thing];

          const newMatch = matchMap.get(value) === undefined;

          if (newMatch) {
            // console.log(
            //   "push",
            //   tablet.filename,
            //   tablet,
            //   JSON.stringify(stateIntermediary.complete, undefined, 2),
            // );

            this.push({ record: stateIntermediary.complete });

            matchMap.set(value, true);
          }

          delete stateIntermediary.complete;
        }
      }

      // this will stream final after file reader streams
      stateIntermediary = parseLine(stateIntermediary, tablet, undefined);

      if (stateIntermediary.complete) {
        // assume that thing is base level leaf
        const value = stateIntermediary.complete[tablet.thing];

        const newMatch = matchMap.get(value) === undefined;

        if (newMatch) {
          // console.log(
          //   "push",
          //   tablet.filename,
          //   tablet,
          //   JSON.stringify(stateIntermediary.complete, undefined, 2),
          // );

          this.push({ record: stateIntermediary.complete });

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
