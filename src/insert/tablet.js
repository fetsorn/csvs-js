import path from "path";
import csv from "papaparse";
import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { mow } from "../record.js";

export function insertTablet(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(query, controller) {
      // pass the query early on to start other tablet streams
      controller.enqueue(query);

      // filter out the { _: trunk, trunk: value }
      // which mow returns when there's no connections
      const grains = mow(query, tablet.trunk, tablet.branch).filter((grain) => grain[tablet.branch] !== undefined);

      const lines = grains.map(
        ({ [tablet.trunk]: key, [tablet.branch]: value }) =>
          csv.unparse([[key, value]], { delimiter: ",", newline: "\n" }),
      );

      const insertStream = new ReadableStream({
        start(controller) {
          for (const line of lines) {
            controller.enqueue(line)
          }

          controller.close()
        }
      });

      await insertStream.pipeTo(new WritableStream({
        async write(line) {
          await fs.promises.appendFile(filepath, line + "\n");
        },
      }))
    },
  });
}
