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

      let stateIntermediary = { initial: state, current: state };

      for (const line of lines) {
        const { next, ...stateNew } = parseLine(
          stateIntermediary,
          tablet,
          line,
        );

        if (next && stateNew.previous) {
          console.log(
            "push",
            tablet.filename,
            tablet,
            JSON.stringify(stateNew.previous, undefined, 2),
          );
          this.push({ ...stateNew.previous });
        }

        stateIntermediary = stateNew;
      }

      this.push(stateIntermediary.matched ?? stateIntermediary.current);

      callback();
    },
  });
}
