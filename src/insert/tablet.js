import path from "path";
import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { sortFile } from "large-sort";
import { isEmpty } from "../stream.js";
import { insertLine } from "./line.js";

export async function insertTablet(fs, dir, relations, filename) {
  const filepath = path.join(dir, filename);

  // form new lines from relations
  const lines = Object.entries(relations).map(([key, values]) =>
    values.map((value) => insertLine(key, value)),
  );

  const insertStream = ReadableStream.from(lines);

  const tmpdir = await fs.promises.mkdtemp(path.join(dir, "insert-"));

  const tmpPath = path.join(tmpdir, filename);

  if (!(await isEmpty(fs, filepath))) {
    await fs.promises.copyFile(filepath, tmpPath);
  }

  const writeStream = new WritableStream({
    async write(line) {
      await fs.promises.appendFile(tmpPath, line + "\n");
    },
  });

  await insertStream.pipeTo(writeStream);

  if (!(await isEmpty(fs, tmpPath))) {
    const sortedPath = `${tmpPath}_sorted`;

    // sort file
    await sortFile(tmpPath, sortedPath);

    await fs.promises.appendFile(sortedPath, "\n");

    await fs.promises.rm(tmpPath);

    await fs.promises.rename(sortedPath, filepath);
  }

  await fs.promises.rmdir(tmpdir);
}
