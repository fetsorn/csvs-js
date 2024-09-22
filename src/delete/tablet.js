import path from "path";
import os from "os";
import { promisify } from "util";
import stream from "stream";
import { pruneLine } from "./line.js";
import readline from "readline";

export async function pruneTablet(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  if (!fs.existsSync(filepath)) return;

  const fileStream = fs.createReadStream(filepath);

  const pruneStream = new stream.Transform({
    transform(line, encoding, callback) {
      const isMatch = pruneLine(tablet, line.toString());

      if (!isMatch) {
        this.push(line);
        this.push("\n");
      }

      callback();
    },
  });

  const tmpdir = await fs.mkdtempSync(os.tmpdir());

  const tmpPath = path.join(tmpdir, tablet.filename);

  const writeStream = fs.createWriteStream(tmpPath);

  const pipeline = promisify(stream.pipeline);

  try {
    await pipeline([
      fileStream,
      (input) => readline.createInterface({ input }),
      pruneStream,
      writeStream,
    ]);
  } catch (e) {
    console.error(e);
  }

  if (fs.existsSync(tmpPath)) {
    await fs.promises.rename(tmpPath, filepath);
  }
}
