import path from "path";

export async function isEmpty(fs, filepath) {
  // only use functions covered by lightning-fs
  try {
    const stats = await fs.promises.stat(filepath);

    if (stats.size > 0) {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export async function sortFile(fs, dir, filename) {
  const filepath = path.join(dir, filename);

  const tmpdir = await fs.promises.mkdtemp(path.join(dir, "sort-"));

  const tmpPath = path.join(tmpdir, filename);

  const empty = await isEmpty(fs, filepath);

  const lineStream = empty
    ? ReadableStream.from([])
    : chunksToLines(fs.createReadStream(filepath));

  const lines = [];

  for await (const line of lineStream) {
    lines.push(line);
  }

  const linesSorted = lines.sort();

  for (const line of linesSorted) {
    await fs.promises.appendFile(tmpPath, line);
  }

  if (!empty) {
    // read file into memory because
    // fs.rename doesn't work with external drives
    // fs.copyFile doesn't work with lightning fs
    const file = await fs.promises.readFile(tmpPath);

    await fs.promises.writeFile(filepath, file);

    await fs.promises.unlink(tmpPath);
  }

  await fs.promises.rmdir(tmpdir);
}

/**
 * @param chunkIterable An asynchronous or synchronous iterable
 * over “chunks” (arbitrary strings)
 * @returns An asynchronous iterable over “lines”
 * (strings with at most one newline that always appears at the end)
 * https://2ality.com/2019/11/nodejs-streams-async-iteration.html
 */
export async function* chunksToLines(chunkIterable) {
  let previous = "";

  for await (const chunk of chunkIterable) {
    let startSearch = previous.length;

    previous += chunk;

    while (true) {
      const eolIndex = previous.indexOf("\n", startSearch);

      if (eolIndex < 0) break;

      // line includes the EOL
      const line = previous.slice(0, eolIndex + 1);

      yield line;

      previous = previous.slice(eolIndex + 1);

      startSearch = 0;
    }
  }

  if (previous.length > 0) {
    yield previous;
  }
}
