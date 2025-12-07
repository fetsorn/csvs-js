import path from "path";
import { isEmpty, chunksToLines } from "../stream.js";
import { pruneLine } from "./line.js";

async function foo(fs, dir, tablet, tmpPath) {
  const filepath = path.join(dir, tablet.filename);

  if (await isEmpty(fs, filepath)) return undefined;

  const lineStream = chunksToLines(fs.createReadStream(filepath));

  for await (const line of lineStream) {
    const isMatch = pruneLine(tablet, line);

    if (!isMatch) {
      await fs.promises.appendFile(tmpPath, line);
    }
  }
}

export async function pruneTablet(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  const tmpdir = await fs.promises.mkdtemp(path.join(dir, "prune-"));

  const tmpPath = path.join(tmpdir, tablet.filename);

  await foo(fs, dir, tablet, tmpPath);

  if (await isEmpty(fs, tmpPath)) {
    try {
      await fs.promises.unlink(filepath);
    } catch {
      // do nothing
    }
  } else {
    // fs.rename doesn't work with external drives
    // fs.copyFile doesn't work with lightning fs
    const file = await fs.promises.readFile(tmpPath);

    await fs.promises.writeFile(filepath, file);

    // unlink to rmdir later
    await fs.promises.unlink(tmpPath);
  }

  // use rmdir because lightningfs doesn't support rm
  await fs.promises.rmdir(tmpdir);
}
