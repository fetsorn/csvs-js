import path from "path";
import csv from "papaparse";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { updateSchemaStream } from "./schema.js";
import { updateLineStream } from "./line.js";

export function updateTabletStream(fs, dir, tablet) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(state, controller) {
      // pass the query early on to start other tablet streams
      controller.enqueue(state);

      const fileStream = (await isEmpty(fs, filepath))
        ? ReadableStream.from([""])
        : ReadableStream.from(fs.createReadStream(filepath));

      const isSchema = tablet.filename === "_-_.csv";

      const updateStream = isSchema
        ? updateSchemaStream(state.query)
        : updateLineStream(state.query, tablet);

      const tmpdir = await fs.promises.mkdtemp(path.join(dir, "update-"));

      const tmpPath = path.join(tmpdir, tablet.filename);

      await fileStream
        .pipeThrough(createLineStream())
        .pipeThrough(updateStream)
        .pipeTo(new WritableStream({
          async write(line) {
            await fs.promises.appendFile(tmpPath, line);
          },
        }));

      if (!(await isEmpty(fs, tmpPath))) {
        // use copyFile because rename doesn't work with external drives
        await fs.promises.copyFile(tmpPath, filepath);

        // unlink to rmdir later
        await fs.promises.unlink(tmpPath);
      }

      // use rmdir because lightningfs doesn't support rm
      await fs.promises.rmdir(tmpdir);
    },
  });
}
