import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { selectSchema } from "../select/index.js";
import { toSchema, findCrown } from "../schema.js";
import { sortFile } from "../stream.js";
import { recordToRelationMap } from "../record.js";
import { insertTablet } from "./tablet.js";

export async function insertRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  // writable
  return new WritableStream({
    async write(record) {
      this.base = record._;

      // build a relation map of the record. tablet -> key -> list of values
      const relationMap = recordToRelationMap(schema, record);

      // for each branch in crown
      const crown = findCrown(schema, this.base);

      const promises = crown.map((branch) => {
        const { trunk } = schema[branch];

        const filename = `${trunk}-${branch}.csv`;

        return insertTablet(fs, dir, relationMap[filename] ?? {}, filename);
      });

      await Promise.all(promises);
    },

    async close() {
      // for each branch in crown
      const crown = findCrown(schema, this.base);

      const promises = crown.map((branch) => {
        const { trunk } = schema[branch];

        const filename = `${trunk}-${branch}.csv`;

        return sortFile(fs, dir, filename);
      });

      await Promise.all(promises);
    },
  });
}

export async function insertRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  let records = Array.isArray(query) ? query : [query];

  const queryStream = ReadableStream.from(records);

  const writeStream = await insertRecordStream({ fs, dir });

  await queryStream.pipeTo(writeStream);
}
