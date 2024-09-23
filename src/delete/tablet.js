import path from "path";
import { pruneLine } from "./line.js";
import { createLineStream } from "../stream.js";

export async function pruneTablet(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  if (!fs.existsSync(filepath)) return;

  const fileStream = ReadableStream.from(fs.createReadStream(filepath));

  const pruneStream = new TransformStream({
    transform(line, controller) {
      const isMatch = pruneLine(tablet, line);

      if (!isMatch) {
        controller.enqueue(line);
      }
    },
  });

  const tmpdir = await fs.mkdtempSync(path.join(dir, "prune-"));

  const tmpPath = path.join(tmpdir, tablet.filename);

  const writeStream = new WritableStream({
    write(line) {
      fs.appendFileSync(tmpPath, line);
    },
  });

  await fileStream
    .pipeThrough(createLineStream())
    .pipeThrough(pruneStream)
    .pipeTo(writeStream);

  if (fs.existsSync(tmpPath)) {
    await fs.promises.rename(tmpPath, filepath);
  }

  await fs.promises.rmdir(tmpdir);
}
