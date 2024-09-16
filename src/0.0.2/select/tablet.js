import stream from "stream";
import { parseLine } from "./line.js";

/**
 * This returns an array of streams that read tablets.
 * @name shell
 * @function
 * @param {object} query
 * @returns {Object[]}
 */
export function parseTablet(cache, tablet) {
  // TODO replace with file stream
  const lines = cache[tablet.filename].split("\n");

  return new stream.Transform({
    objectMode: true,

    transform(state, encoding, callback) {
      // console.log(
      //   "tablet",
      //   tablet,
      //   "\n",
      //   lines,
      //   "\n",
      //   JSON.stringify(state, undefined, 2),
      // );
      const stateInitial = state;

      let stateIntermediary = stateInitial;

      let statePrevious = undefined;

      let isEnd = false;
      let isNext = false;

      for (const line of lines) {
        // take "next" here for checking lists, never pass "next = true" to push
        const { next, end, ...stateNew } = parseLine(
          stateIntermediary,
          tablet,
          line,
        );

        if (end) isEnd = end;
        if (next) isNext = next;

        // TODO erase regex here
        stateIntermediary = stateNew;

        if (next && this.toggle) {
          isNext = false;
          this.push({ ...statePrevious, keyPrevious: undefined });
        }

        if (next) {
          statePrevious = stateIntermediary;
          stateIntermediary = stateInitial;
          this.toggle = true;
        }
      }

      // if no match, end of file returns stateInitial
      if (isEnd && !isNext && tablet.isAppend) {
        this.push({ ...stateInitial, keyPrevious: undefined });

        callback();

        return;
      }

      // if match, end of file pushes the last record
      if (isEnd && isNext) {
        this.push({ ...statePrevious, keyPrevious: undefined });

        callback();

        return;
      }

      callback();
    },
  });
}
