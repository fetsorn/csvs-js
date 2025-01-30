import csv from "papaparse";
import { mow } from "../record.js";

export function updateLineStream(query, tablet) {
  const grains = mow(query, tablet.trunk, tablet.branch);

  // get the keys and all values for each key, all sorted
  let keys = [...new Set(grains.map((grain) => grain[tablet.trunk]))].sort();

  const values = grains.reduce((acc, grain) => {
    const key = grain[tablet.trunk];

    const value = grain[tablet.branch];

    // filter out the { _: a, a: undefined } which mow returns
    // when there's no connections
    // TODO refactor mow to remove this
    if (value === undefined) return acc;

    const valuesOld = acc[key] ?? [];

    const valuesNew = [...valuesOld, value].sort();

    return { ...acc, [key]: valuesNew };
  }, {});

  function insertAndForget(key, controller) {
    for (const value of values[key] ?? []) {
      const line = csv.unparse([[key, value]], {
        delimiter: ",",
        newline: "\n",
      });

      controller.enqueue(line + "\n");
    }

    keys = keys.filter((k) => k !== key);

    return undefined;
  }

  let stateIntermediary = {};

  return new TransformStream({
    async transform(line, controller) {
      if (line === "") return;

      const {
        data: [[fst, snd]],
      } = csv.parse(line, { delimiter: "," });

      const fstIsNew =
        stateIntermediary.fst === undefined || stateIntermediary.fst !== fst;

      // if previous isMatch and fstIsNew
      if (stateIntermediary.isMatch && fstIsNew) {
        insertAndForget(stateIntermediary.fst, controller);
      }

      // if fstIsNew
      if (fstIsNew) {
        // insert and forget all record keys between previous and next
        const keysBetween = keys.filter((key) => {
          const isAfter =
            stateIntermediary.fst === undefined ||
            stateIntermediary.fst.localeCompare(key) < 1;

          const isBefore = key.localeCompare(fst) === -1;

          const isBetween = isAfter && isBefore;

          return isBetween;
        });

        for (const key of keysBetween) {
          insertAndForget(key, controller);
        }
      }

      // match this fst against all keys
      const isMatch = keys.includes(fst);

      if (isMatch) {
        // if keys include this key, prune line
        // it will be inserted again before the next key
      } else  {
        // otherwise write line unchanged
        controller.enqueue(line);
      }

      stateIntermediary = { fst, isMatch };
    },

    flush(controller) {
      // TODO what if key repeats many times in keys
      // for each key in alphabetic order
      for (const key of keys) {
        insertAndForget(key, controller);
      }
    },
  });
}
