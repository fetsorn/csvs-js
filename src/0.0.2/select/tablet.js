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

    transform(record, encoding, callback) {
      console.log(
        "tablet",
        tablet,
        "\n",
        lines,
        "\n",
        JSON.stringify(record, undefined, 2),
      );

      let stateIntermediary = { initial: record, current: record };
      let hasMatch = false;

      for (const line of lines) {
        stateIntermediary = parseLine(stateIntermediary, tablet, line);

        if (stateIntermediary.previous) {
          console.log(
            "push",
            tablet.filename,
            tablet,
            JSON.stringify(stateIntermediary.previous, undefined, 2),
          );
          this.push({ ...stateIntermediary.previous });
          hasMatch = true;
          stateIntermediary.previous = undefined;
        }
      }

      stateIntermediary = parseLine(stateIntermediary, tablet, undefined);

      if (stateIntermediary.previous) {
        console.log(
          "push",
          tablet.filename,
          tablet,
          JSON.stringify(stateIntermediary.previous, undefined, 2),
        );
        this.push({ ...stateIntermediary.previous });
        hasMatch = true;
      }

      // if no match and tablet is not a filter, push initial record
      if (hasMatch === false && tablet.passthrough) {
        console.log(
          "push",
          tablet.filename,
          tablet,
          JSON.stringify(record, undefined, 2),
        );
        this.push(record);
      }

      callback();
    },
  });
}
