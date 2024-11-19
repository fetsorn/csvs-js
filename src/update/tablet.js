import path from "path";
import csv from "papaparse";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";

function foo(tablet) {
  if (tablet.filename === 'datum-actdate.csv')
    return [{ _: "datum", datum: "value3", actdate: "2003-01-01" }]
  if (tablet.filename === 'datum-actname.csv')
    return [{ _: "datum", datum: "value3", actname: "name3" }]
  if (tablet.filename === 'datum-filepath.csv')
    return [{ _: "datum", datum: "value3", filepath: "path/to/3" }]
  if (tablet.filename === 'datum-saydate.csv')
    return [{ _: "datum", datum: "value3", saydate: "2003-03-01" }]
  if (tablet.filename === 'datum-sayname.csv')
    return [{ _: "datum", datum: "value3", sayname: "name3" }]
  return []
}

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

      const sireres = foo(tablet, query);

      // get the keys and all values for each key, all sorted
      let keys = sireres.map((sirere) => sirere[tablet.trunk]);

      const values = sireres.reduce((acc, sirere) => {
        const key = sirere[tablet.trunk];

        const value = sirere[tablet.branch];

        const valuesOld = acc[key] ?? [];

        const valuesNew = [ ...valuesOld, value ];

        return { ...acc, [key]: valuesNew }
      }, {}) ;

      let stateIntermediary = { };

      const updateStream = new TransformStream({
        async transform(line, controllerInner) {
          if (tablet.filename === 'datum-actdate.csv')
            console.log("transform line", line);

          if (line === "") return;

          const {
            data: [[fst, snd]],
          } = csv.parse(line, { delimiter: "," });

          const fstIsNew = stateIntermediary.fst !== fst;

          // TODO assume it is not a regex. what if this is regex?
          // match this fst against all keys
          // TODO do we need to match this
          //      against the key that will be removed?
          // TODO what if next key has the same fst and also needs to match?
          // TODO what if next key has a different fst but matches the same key?
          const matchingKeys = [];

          const isMatch = matchingKeys.length > 0;

          // if line is new, try to insert
          if (fstIsNew) {
            // NOTE: use reduce to filter this key?
            // for each key in alphabetic order
            //   if key is after previous fst or previous is undefined and
            //   if key is before this fst
            //     for all values in alphabetic order
            //       enqueue a line of key,value
            //     remove key from keys
            //   otherwise leave the key as is
          }

          // if this line matched one of keys, don't enqueue
          // if did not match, enqueue the original line
          if (!isMatch) {
            controllerInner.enqueue(line)
          }

          // write fst to memory
          stateIntermediary = { fst };
        },

        flush(controllerInner) {
          if (tablet.filename === 'datum-actdate.csv')
            console.log("flush line");

          // for each key in alphabetic order
          for (const key of keys) {
            // for all values in alphabetic order
            for (const value of values[key] ?? []) {
              const line = csv.unparse([[key, value]], { delimiter: ",", newline: "\n" }) + "\n";

              // enqueue a line of key,value
              controllerInner.enqueue(line)
            }
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
