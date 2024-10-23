import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import path from "path";
import { pruneLine } from "./line.js";
import { isEmpty, createLineStream } from "../stream.js";

export async function pruneTablet(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  if (await isEmpty(fs, filepath)) return;

  const fileStream = ReadableStream.from(fs.createReadStream(filepath));

  const pruneStream = new TransformStream({
    transform(line, controller) {
      const isMatch = pruneLine(tablet, line);

      if (!isMatch) {
        controller.enqueue(line);
      }
    },
  });

  const tmpdir = await fs.promises.mkdtemp(path.join(dir, "prune-"));

  const tmpPath = path.join(tmpdir, tablet.filename);

  const writeStream = new WritableStream({
    async write(line) {
      await fs.promises.appendFile(tmpPath, line);
    },
  });

  await fileStream
    .pipeThrough(createLineStream())
    .pipeThrough(pruneStream)
    .pipeTo(writeStream);

  if (!(await isEmpty(fs, filepath))) {
    // use copyFile because rename doesn't work with external drives
    await fs.promises.copyFile(tmpPath, filepath);

    // unlink to rmdir later
    await fs.promises.unlink(tmpPath);
  }

  // keep rmdir because lightningfs doesn't support rm
  await fs.promises.rmdir(tmpdir);
}
