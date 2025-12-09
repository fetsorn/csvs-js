import path from "path";
import { mow } from "../record.js";
import { isEmpty, chunksToLines } from "../stream.js";
import { buildLine } from "./line.js";

export async function buildTablet(fs, dir, tablet, { entry }) {
  const filepath = path.join(dir, tablet.filename);

  const lineStream = (await isEmpty(fs, filepath))
    ? ReadableStream.from([])
    : chunksToLines(fs.createReadStream(filepath));

  const stateInitial = {
    entry,
    fst: undefined,
    isMatch: false,
  };

  let state = { ...stateInitial };

  const grains = mow(state.entry, tablet.trait, tablet.thing);

  for await (const line of lineStream) {
    if (line === "") continue;

    state = buildLine(state, tablet, grains, line);

    if (state.last) {
      return state.last;
    }
  }

  // if matched, push to the next tablet
  // if not matched, still push to the next tablet
  const stateToPush = {
    entry: state.entry,
  };

  return stateToPush;
}
