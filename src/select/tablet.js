import path from "path";
import csv from "papaparse";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { selectSchemaStream } from "./schema.js";
import { selectLineStream, parseLineStream } from "./line.js";

export function selectTabletStream(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(state, controller) {
      const fileStream = new ReadableStream({
        async start(controller) {
          if (await isEmpty(fs, filepath)) {
            controller.enqueue("")
          } else {
            for await (const a of fs.createReadStream(filepath)) {
              controller.enqueue(a)
            }
          }

          controller.close()
        }
      })

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
