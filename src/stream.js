import { TransformStream } from "@swimburger/isomorphic-streams";
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

function concatArrayBuffers(chunks) {
  const result = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));

  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);

    offset += chunk.length;
  }

  const str = new TextDecoder().decode(result);

  return str;
}

export function createLineStream() {
  let _buffer = [];

  return new TransformStream({
    transform: (chunk, controller) => {
      if (_buffer === undefined) _buffer = [];

      let index;

      let rest = chunk;

      while ((index = rest.indexOf(0x0a)) !== -1) {
        controller.enqueue(
          concatArrayBuffers([..._buffer, rest.slice(0, index + 1)]),
        );

        rest = rest.slice(index + 1);

        _buffer = [];
      }

      if (rest.length > 0) {
        _buffer.push(rest);
      }
    },

    flush: (controller) => {
      if (_buffer.length > 0) {
        controller.enqueue(concatArrayBuffers(_buffer));
      }
    },
  });
}

export async function sortFile(fs, dir, filename) {
  const filepath = path.join(dir, filename);

  // TODO create to temp
  const tmpdir = await fs.promises.mkdtemp(path.join(dir, "sort-"));

  const tmpPath = path.join(tmpdir, filename);

  const fileStream = new ReadableStream({
    async start(controller) {
      if (await isEmpty(fs, filepath)) {
        controller.enqueue("")
      } else {
        for await (const a of fs.createReadStream(filepath)) {
          controller.enqueue(a)
        }
      }

      controller.close()
    }
  })

  const lines = [];

  const collectStream = new WritableStream({
    write(line) {
      lines.push(line);
    },
  });

  await fileStream.pipeThrough(createLineStream()).pipeTo(collectStream);

  const linesSorted = lines.sort();

  const linesStream = new ReadableStream({
    start(controller) {
      for (const line of linesSorted) {
        controller.enqueue(line)
      }

      controller.close()
    }
  });

  const writeStream = new WritableStream({
    async write(line) {
      await fs.promises.appendFile(tmpPath, line);
    },
  });

  await linesStream.pipeTo(writeStream);

  if (!(await isEmpty(fs, tmpPath))) {
    // use copyFile because rename doesn't work with external drives
    // fs.rename doesn't work with external drives
    // fs.copyFile doesn't work with lightning fs
    const file = await fs.promises.readFile(tmpPath);

    await fs.promises.writeFile(filepath, file);

    await fs.promises.unlink(tmpPath);
  }

  await fs.promises.rmdir(tmpdir);
}
