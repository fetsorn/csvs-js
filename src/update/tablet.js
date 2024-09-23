import path from "path";
import { updateLine } from "./line.js";
import { isEmpty, createLineStream } from "../stream.js";

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

  const tmpdir = await fs.mkdtempSync(path.join(dir, "update-"));

  const tmpPath = path.join(tmpdir, filename);

  const writeStream = new WritableStream({
    write(line) {
      fs.appendFileSync(tmpPath, line + "\n");
    },
  });

  await fileStream
    .pipeThrough(createLineStream())
    .pipeThrough(updateStream)
    .pipeTo(writeStream);

  if (!(await isEmpty(fs, tmpPath))) {
    await fs.promises.rename(tmpPath, filepath);
  }

  await fs.promises.rmdir(tmpdir);
}
