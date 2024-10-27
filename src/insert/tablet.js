import path from "path";
import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { insertLine } from "./line.js";

export async function insertTablet(fs, dir, relations, filename) {
  const filepath = path.join(dir, filename);

  // form new lines from relations
  const lines = Object.entries(relations).map(([key, values]) =>
    values.map((value) => insertLine(key, value)),
  );

  const insertStream = ReadableStream.from(lines);

  const writeStream = new WritableStream({
    async write(line) {
      await fs.promises.appendFile(filepath, line + "\n");
    },
  });

  await insertStream.pipeTo(writeStream);
}
