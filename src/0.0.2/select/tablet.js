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
      console.log(
        "tablet",
        tablet,
        "\n",
        lines,
        "\n",
        JSON.stringify(state, undefined, 2),
      );

      let stateIntermediary = state;

      for (const line of lines) {
        const { next, end, ...stateNew } = parseLine(
          stateIntermediary,
          tablet,
          line,
        );

        if (next || end) {
          console.log(
            "push",
            tablet.filename,
            JSON.stringify(stateIntermediary, undefined, 2),
          );
          this.push({ ...stateIntermediary });
        }

        stateIntermediary = stateNew;
      }

      callback();
    },
  });
}
