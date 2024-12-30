import csv from "papaparse";

export function pruneLineStream(tablet) {
  return new TransformStream({
    transform(line, controller) {
      const {
        data: [[fst, snd]],
      } = csv.parse(line, { delimiter: "," });

      const trait = tablet.traitIsFirst ? fst : snd;

      const isMatch = line !== "" && trait === tablet.trait;

      if (!isMatch) {
        controller.enqueue(line);
      }
    },
  });
}
