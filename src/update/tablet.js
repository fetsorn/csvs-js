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
      if (tablet.filename === 'datum-actdate.csv')
        console.log("updateTablet", query, tablet);

      // pass the query early on to start other tablet streams
      controllerOuter.enqueue(query);

      const fileStream = (await isEmpty(fs, filepath))
            ? ReadableStream.from([""])
            : ReadableStream.from(fs.createReadStream(filepath));

      let stateIntermediary = { };

      const updateStream = new TransformStream({
        async transform(line, controllerInner) {
          if (tablet.filename === 'datum-actdate.csv')
            console.log("transform line", line);

          stateIntermediary = updateLine(stateIntermediary, tablet, line);

          if (stateIntermediary.line) {
              controllerInner.enqueue(stateIntermediary.line);

              delete stateIntermediary.line;
          }
        },

        flush(controllerInner) {
          if (tablet.filename === 'datum-actdate.csv')
            console.log("flush line");

          // TODO do some cleanup
          if (stateIntermediary.line) {
              controllerInner.enqueue(stateIntermediary.line);
          }
        }
      })

      const toLinesStream = new TransformStream({
        async transform(record, controllerInner) {
          if (tablet.filename === 'datum-actdate.csv')
            console.log("transform toLines", record);

          const fst = record[tablet.trunk];

          const snd = record[tablet.branch];

          const line = csv.unparse([fst, snd], { delimiter: ",", newline: "\n" });

          controllerInner.enqueue(line)
        }
      })

      const tmpdir = await fs.promises.mkdtemp(path.join(dir, "update-"));

      const tmpPath = path.join(tmpdir, tablet.filename);

      const writeStream = new WritableStream({
        async write(line) {
          if (tablet.filename === 'datum-actdate.csv')
            console.log("write line", line);

          await fs.promises.appendFile(tmpPath, line);
        },
      });

      await fileStream
        .pipeThrough(createLineStream())
        .pipeThrough(updateStream)
        // .pipeThrough(toLinesStream)
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
