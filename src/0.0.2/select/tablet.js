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
      let stateIntermediary = state;

      for (const line of lines) {
        // take "next" here for checking lists, never pass "next = true" to push
        const { next, ...stateNew } = parseLine(
          stateIntermediary,
          tablet,
          line,
        );

        // if this line proved to be new, push previous record
        if (next && this.toggle) {
          this.push({ ...stateIntermediary, keyPrevious: undefined });
        }

        // skip first record
        if (next) {
          this.toggle = true;
        }

        // TODO erase regex here
        stateIntermediary = stateNew;
      }

      this.push({ ...stateIntermediary, keyPrevious: undefined });

      callback();
    },
  });
}
