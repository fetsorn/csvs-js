import path from "path";
import csv from "papaparse";
import {
  WritableStream,
  ReadableStream,
  TransformStream,
} from "@swimburger/isomorphic-streams";
import { isEmpty, createLineStream } from "../stream.js";
import { winnow } from "../record.js";

export function updateTabletStream(fs, dir, tablet, schema) {
  const filepath = path.join(dir, tablet.filename);

  return new TransformStream({
    async transform(query, controllerOuter) {
      // pass the query early on to start other tablet streams
      controllerOuter.enqueue(query);

      const fileStream = (await isEmpty(fs, filepath))
            ? ReadableStream.from([""])
            : ReadableStream.from(fs.createReadStream(filepath));

      const isSchema = tablet.filename === "_-_.csv";

      function winnowSchema(record) {
        const grainsSchema = record.entries().filter(([branch]) => branch !== "_").reduce((withEntry, [trunk, leafValue]) => {
          const leaves = Array.isArray(leafValue) ? leafValue : [leafValue];

          const grainsTrunk = leaves.reduce((withLeaf, leaf) => ({ _: _, trunk: leaf }), []);

          return grainsTrunk;
        }, [])

        return grainsSchema;
      }

      const grains = isSchema ? grainsSchema : winnow(schema, query.query, tablet.trunk, tablet.branch);

      // get the keys and all values for each key, all sorted
      let keys = [...(new Set(grains.map((grain) => grain[tablet.trunk])))].sort();

      const values = grains.reduce((acc, grain) => {
        const key = grain[tablet.trunk];

        const value = grain[tablet.branch];

        const valuesOld = acc[key] ?? [];

        const valuesNew = [ ...valuesOld, value ].sort();

        return { ...acc, [key]: valuesNew }
      }, {}) ;

      // if (tablet.filename === "export_tags-export1_tag.csv")
      //   console.log(JSON.stringify(query.query, null, 2), grains, keys, values)

      function insertAndForget(key, controller) {
        for (const value of values[key] ?? []) {
          const line = csv.unparse(
            [[key, value]],
            { delimiter: ",", newline: "\n" }
          );

          controller.enqueue(line + "\n");
        }

        keys = keys.filter((k) => k !== key);

        return undefined;
      }

      let stateIntermediary = { };

      const updateStream = new TransformStream({
        async transform(line, controllerInner) {
          if (line === "") return;

          const {
            data: [[fst, snd]],
          } = csv.parse(line, { delimiter: "," });

          const fstIsNew = stateIntermediary.fst === undefined || stateIntermediary.fst !== fst;

          // if previous isMatch and fstIsNew
          if (stateIntermediary.isMatch && fstIsNew) {
            insertAndForget(stateIntermediary.fst, controllerInner);
          }

          // if fstIsNew
          if (fstIsNew) {
            // insert and forget all record keys between previous and next
            const keysBetween = keys.filter((key) => {
              const isAfter = stateIntermediary.fst === undefined || stateIntermediary.fst.localeCompare(key) < 1;

              const isBefore = key.localeCompare(fst) === -1;

              const isBetween = isAfter && isBefore;

              return isBetween
            });

            for (const key of keysBetween) {
              insertAndForget(key, controllerInner);
            }
          }

          // match this fst against all keys
          const isMatch = keys.includes(fst);

          // if match, set doInsert and prune line
          if (!isMatch) {
            controllerInner.enqueue(line);
          }

          stateIntermediary = { fst, isMatch };
        },

        flush(controllerInner) {
          // TODO what if key repeats many times in keys
          // for each key in alphabetic order
          for (const key of keys) {
            insertAndForget(key, controllerInner);
          }
        }
      })

      const tmpdir = await fs.promises.mkdtemp(path.join(dir, "update-"));

      const tmpPath = path.join(tmpdir, tablet.filename);

      const writeStream = new WritableStream({
        async write(line) {
          await fs.promises.appendFile(tmpPath, line);
        },
      });

      await fileStream
        .pipeThrough(createLineStream())
        .pipeThrough(updateStream)
        .pipeTo(writeStream);

      if (!(await isEmpty(fs, tmpPath))) {
        // use copyFile because rename doesn't work with external drives
        await fs.promises.copyFile(tmpPath, filepath);

        // unlink to rmdir later
        await fs.promises.unlink(tmpPath);
      }

      // use rmdir because lightningfs doesn't support rm
      await fs.promises.rmdir(tmpdir);
    }
  })
}
