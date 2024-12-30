import path from "path";
import csv from "papaparse";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { selectSchemaStream } from "./schema.js";
import { parseLineStream } from "./line.js";

export function selectLineStream(state, tablet) {
  // value tablets receive a matchMap from accumulating tablets
  // but don't need to do anything with it or with the accompanying entry
  const dropMatchMap = tablet.passthrough && state.matchMap !== undefined;

  if (dropMatchMap) {
    return new TransformStream({
      transform(line, controller) {
        // do nothing
      },
    });
  }

  // accumulating tablets find all values
  // matched at least once across the dataset
  // to do this they track matches in a shared match map
  // when a new entry is found, it is sent forward without a matchMap
  // and each accumulating tablet forwards the entry as is
  // until the entry reaches non-accumulating value tablets
  // assume the entry is new
  // because it has been checked against the match map upstream
  const forwardAccumulating = tablet.accumulating && state.matchMap === undefined;

  // TODO what if the thing branch changes
  // from one group of accumulating tablets to another
  // and will need to invalidate matchMap

  if (forwardAccumulating) {
    return new TransformStream({
      start(controller) {
        controller.enqueue({
          query: state.query,
          entry: state.entry,
          source: tablet.filename,
        });
      },

      transform(line, controller) {
        // do nothing
      },
    });
  }

  return parseLineStream(state, tablet);
}

export function selectTabletStream(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(state, controller) {
      const fileStream = (await isEmpty(fs, filepath))
        ? ReadableStream.from([""])
        : ReadableStream.from(fs.createReadStream(filepath));

      const isSchema = tablet.filename === "_-_.csv";

      const selectStream = isSchema
        ? selectSchemaStream(state)
        : selectLineStream(state, tablet);

      await fileStream
        .pipeThrough(createLineStream())
        .pipeThrough(selectStream)
        .pipeTo(
          new WritableStream({
            async write(state) {
              controller.enqueue(state);
            },
          }),
        );
    },
  });
}
