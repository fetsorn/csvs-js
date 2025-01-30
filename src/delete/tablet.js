import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import path from "path";
import { isEmpty, createLineStream } from "../stream.js";
import { pruneLineStream } from "./line.js";

export async function pruneTablet(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  if (await isEmpty(fs, filepath)) return undefined;

  const fileStream = ReadableStream.from(fs.createReadStream(filepath));

  const pruneStream = pruneLineStream(tablet);

  const tmpdir = await fs.promises.mkdtemp(path.join(dir, "prune-"));

  const tmpPath = path.join(tmpdir, tablet.filename);

  await fileStream
    .pipeThrough(createLineStream())
    .pipeThrough(pruneStream)
    .pipeTo(new WritableStream({
      async write(line) {
        await fs.promises.appendFile(tmpPath, line);
      },
    }));

  if (!(await isEmpty(fs, filepath))) {
    // use copyFile because rename doesn't work with external drives
    // fs.rename doesn't work with external drives
    // fs.copyFile doesn't work with lightning fs
    const file = await fs.promises.readFile(tmpPath);

    await fs.promises.writeFile(filepath, file);

    // unlink to rmdir later
    await fs.promises.unlink(tmpPath);
  }

  // keep rmdir because lightningfs doesn't support rm
  await fs.promises.rmdir(tmpdir);
}
