import csv from "papaparse";
import { escape, unescape } from "../escape.js";

export function pruneLineStream(tablet) {
  return new TransformStream({
    transform(line, controller) {
      const {
        data: [[fstEscaped, sndEscaped]],
      } = csv.parse(line, { delimiter: "," });

      const fst = unescape(fstEscaped);

      const snd = unescape(sndEscaped);

      const trait = tablet.traitIsFirst ? fst : snd;

      const isMatch = line !== "" && trait === tablet.trait;

      if (!isMatch) {
        controller.enqueue(line);
      }
    },
  });
}
