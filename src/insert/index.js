import { WritableStream, ReadableStream } from "@swimburger/isomorphic-streams";
import { selectSchema } from "../select/index.js";
import { toSchema } from "../schema.js";
import { findCrown } from "../schema.js";
import { recordToRelationMap } from "../record.js";
import { updateTablet } from "./tablet.js";

export async function insertRecordStream({ fs, dir }) {
  const [schemaRecord] = await selectSchema({ fs, dir });

  const schema = toSchema(schemaRecord);

  // writable
  return new WritableStream({
    async write(record) {
      const base = record._;

      // build a relation map of the record. tablet -> key -> list of values
      const relationMap = recordToRelationMap(schema, record);

      // for each branch in crown
      const crown = findCrown(schema, base);

      const promises = crown.map((branch) => {
        const { trunk } = schema[branch];

        const filename = `${trunk}-${branch}.csv`;

        return updateTablet(fs, dir, relationMap[filename] ?? {}, filename);
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
