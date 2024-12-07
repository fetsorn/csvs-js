import path from "path";
import csv from "papaparse";
import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { winnow } from "../record.js";

export function insertTablet(fs, dir, tablet, schema) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(query, controller) {
      // pass the query early on to start other tablet streams
      controller.enqueue(query);

      const grains = winnow(query, tablet.trunk, tablet.branch);

      const lines = grains.map(({ [tablet.trunk]: key, [tablet.branch]: value }) => csv.unparse([[key, value]], { delimiter: ",", newline: "\n" }));

      const insertStream = ReadableStream.from(lines);

      const writeStream = new WritableStream({
        async write(line) {
          await fs.promises.appendFile(filepath, line + "\n");
        },
      });

      await insertStream.pipeTo(writeStream);
    }
  })
}
