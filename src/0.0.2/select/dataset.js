import { parseTablet } from "./tablet.js";

export function parseDataset(schema, cache, strategy) {
  // TODO replace with reduce, check order of sequential steps
  var accSequential = [];

  for (const group of strategy) {
    // stages inside a group can be run in parallel
    var accParallel = accSequential;

    for (const stage of group) {
      const streamNew = parseTablet(cache, stage);

      accParallel = [...accParallel, streamNew];
    }

    accSequential = [...accParallel];
  }

  const streams = accSequential;

  return streams;
}
