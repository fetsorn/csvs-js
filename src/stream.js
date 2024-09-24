import { TransformStream } from "@swimburger/isomorphic-streams";

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
