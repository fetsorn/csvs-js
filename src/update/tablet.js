import path from "path";
import os from "os";
import stream from "stream";
import { promisify } from "util";
import readline from "readline";
import { updateLine } from "./line.js";

function isEmpty(fs, filepath) {
  if (!fs.existsSync(filepath)) return true;

  const emptyStream = fs.createReadStream(filepath);

  return new Promise((res) => {
    emptyStream.once("data", () => {
      emptyStream.destroy();
      res(false);
    });

    emptyStream.on("end", () => {
      res(true);
    });
  });
}

export async function updateTablet(fs, dir, relations, filename) {
  const filepath = path.join(dir, filename);

  const fileStream = (await isEmpty(fs, filepath))
    ? stream.Readable.from([""])
    : fs.createReadStream(filepath);

  const updateStream = new stream.Transform({
    transform(line, encoding, callback) {
      if (this._state === undefined) this._state = { relations };

      const state = updateLine(this._state, line.toString());

      // append line to output
      if (state.lines !== undefined) {
        for (const lineNew of state.lines) {
          this.push(lineNew);
          this.push("\n");
        }
      }

      this._state = {
        fst: state.fst,
        isMatch: state.isMatch,
        relations: state.relations,
      };

      callback();
    },

    final(callback) {
      if (this._state === undefined) this._state = { relations };

      const state = updateLine(this._state, undefined);

      if (state.lines !== undefined) {
        for (const lineNew of state.lines) {
          this.push(lineNew);
          this.push("\n");
        }
      }

      callback();
    },
  });

  const tmpdir = await fs.mkdtempSync(os.tmpdir());

  const tmpPath = path.join(tmpdir, filename);

  const writeStream = fs.createWriteStream(tmpPath);

  const pipeline = promisify(stream.pipeline);

  try {
    await pipeline([
      fileStream,
      (input) => readline.createInterface({ input }),
      updateStream,
      writeStream,
    ]);
  } catch (e) {
    console.error(e);
  }

  if (!(await isEmpty(fs, tmpPath))) {
    await fs.promises.rename(tmpPath, filepath);
  }
}
