import path from "path";
import csv from "papaparse";
import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { recordToRelationMap } from "../record.js";

export function insertTablet(fs, dir, tablet, schema) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(query, controller) {
      // pass the query early on to start other tablet streams
      controller.enqueue(query);

      // build a relation map of the record. tablet -> key -> list of values
      const relationMap = recordToRelationMap(schema, query.query);

      // TODO remove relations
      const relations = relationMap[tablet.filename] ?? {};

      // form new lines from relations
      const lines = Object.entries(relations).map(([key, values]) =>
        values.map((value) => csv.unparse([[key, value]], { delimiter: ",", newline: "\n" })),
      );

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
