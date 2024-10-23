import path from "path";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { updateLine } from "./line.js";

export async function updateTablet(fs, dir, relations, filename) {
  const filepath = path.join(dir, filename);

  const fileStream = (await isEmpty(fs, filepath))
    ? ReadableStream.from([""])
    : ReadableStream.from(fs.createReadStream(filepath));

  const updateStream = new TransformStream({
    transform(line, controller) {
      if (this._state === undefined) this._state = { relations };

      const state = updateLine(this._state, line);

      // append line to output
      if (state.lines !== undefined) {
        for (const lineNew of state.lines) {
          controller.enqueue(lineNew);
        }
      }

      this._state = {
        fst: state.fst,
        isMatch: state.isMatch,
        relations: state.relations,
      };
    },

    flush(controller) {
      if (this._state === undefined) this._state = { relations };

      const state = updateLine(this._state, undefined);

      if (state.lines !== undefined) {
        for (const lineNew of state.lines) {
          controller.enqueue(lineNew);
        }
      }
    },
  });

  const tmpdir = await fs.promises.mkdtemp(path.join(dir, "update-"));

  const tmpPath = path.join(tmpdir, filename);

  const writeStream = new WritableStream({
    async write(line) {
      await fs.promises.appendFile(tmpPath, line + "\n");
    },
  });

  await fileStream
    .pipeThrough(createLineStream())
    .pipeThrough(updateStream)
    .pipeTo(writeStream);

  if (!(await isEmpty(fs, tmpPath))) {
    // use copyFile because rename doesn't work with external drives
    await fs.promises.copyFile(tmpPath, filepath);

    // unlink to rmdir later
    await fs.promises.unlink(tmpPath);
  }

  // keep rmdir because lightningfs doesn't support rm
  await fs.promises.rmdir(tmpdir);
}
