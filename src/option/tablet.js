import path from "path";
import { ReadableStream } from "@swimburger/isomorphic-streams";
import { isEmpty, chunksToLines } from "../stream.js";
import { optionLine } from "./line.js";

export async function optionTabletStream(fs, dir, tablet, { query, matchMap }) {
  const filepath = path.join(dir, tablet.filename);

  let isDone = false;

  const empty = await isEmpty(fs, filepath);

  const lineStream = empty
    ? ReadableStream.from([])
    : chunksToLines(fs.createReadStream(filepath));

  const lineIterator = lineStream[Symbol.asyncIterator]();

  const entryInitial = { _: tablet.base };

  let stateSaved = {
    query,
    entry: entryInitial,
    fst: undefined,
    isMatch: false,
    matchMap,
  };

  async function pullLine(state) {
    if (isDone) {
      return { done: true, value: undefined };
    }

    const { done, value } = await lineIterator.next();

    if (done) {
      isDone = true;

      if (state.isMatch) {
        state.last = state;
      }

      return { done: false, value: state };
    }

    const stateLine = optionLine(tablet, state, value);

    if (stateLine.last) {
      return { done: false, value: stateLine };
    } else {
      return pullLine(stateLine);
    }
  }

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await pullLine(stateSaved);

      if (done) {
        controller.close();

        return;
      }

      if (value.last) {
        controller.enqueue(value.last);

        value.last = false;
      }

      stateSaved = value;
    },
  });
}
