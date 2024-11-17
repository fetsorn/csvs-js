import path from "path";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { updateLine } from "./line.js";

export function updateTabletStream(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(query, controllerOuter) {
      // pass the query early on to start other tablet streams
      controllerOuter.enqueue(query);

      const fileStream = (await isEmpty(fs, filepath))
            ? ReadableStream.from([""])
            : ReadableStream.from(fs.createReadStream(filepath));

      let stateIntermediary = { };

      const updateStream = new TransformStream({
        async transform(line, controllerInner) {
          stateIntermediary = updateLine(stateIntermediary, tablet, line);

          if (stateIntermediary.complete) {
              controllerInner.enqueue(stateIntermediary.complete);
          }
        },

        flush(controllerInner) {
          // TODO do some cleanup
          if (stateIntermediary.complete) {
              controllerInner.enqueue(stateIntermediary.complete);
          }
        }
      })

      const toLinesStream = new TransformStream({
        async transform(record, controllerInner) {
          const lines = toLines(record)

          for (const line of lines) {
            controllerInner.enqueue(line)
          }
        }
      })

      const tmpdir = await fs.promises.mkdtemp(path.join(dir, "update-"));

      const tmpPath = path.join(tmpdir, tablet.filename);

      const writeStream = new WritableStream({
        async write(line) {
          await fs.promises.appendFile(tmpPath, line + "\n");
        },
      });

      await fileStream
        .pipeThrough(createLineStream())
        .pipeThrough(updateStream)
        .pipeThrough(toLinesStream)
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
  })
}
