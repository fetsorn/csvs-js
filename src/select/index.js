import { queryRecordStream } from "../query/index.js";
import { selectOptionStream } from "../option/index.js";
import { buildRecord } from "../build/index.js";
import { selectSchema } from "../schema/index.js";
import { selectVersion } from "../version/index.js";

// for backwards compatibility with push streams
export function selectRecordStream({ fs, dir }) {
  return new TransformStream({
    async transform(query, controller) {
      const entries = await selectRecord({ fs, dir, query });

      for (const entry of entries) {
        controller.enqueue(entry);
      }
    },
  });
}

export async function selectRecordStreamPull({ fs, dir, query }) {
  const isSchema = query._ === "_";

  const isVersion = query._ === ".";

  const hasLeaves =
    Object.keys(query).filter((key) => key !== "_" && key !== query._).length >
    0;

  let recordIterator;

  let isDone = false;

  async function initStream() {
    // decide whether we want option or query
    const recordStream = hasLeaves
      ? await queryRecordStream({ fs, dir, query })
      : await selectOptionStream({ fs, dir, query });

    recordIterator = recordStream[Symbol.asyncIterator]();
  }

  async function pullRecord() {
    if (isDone) {
      return { done: true, value: undefined };
    }

    if (isSchema) {
      isDone = true;

      const schemaRecord = await selectSchema({ fs, dir });

      return { done: false, value: schemaRecord };
    }

    if (isVersion) {
      isDone = true;

      const versionRecord = await selectVersion({ fs, dir });

      return { done: false, value: versionRecord };
    }

    if (recordIterator === undefined) {
      await initStream();
    }

    const { done, value } = await recordIterator.next();

    if (done) {
      return { done: true, value: undefined };
    }

    const record = await buildRecord({ fs, dir, query: [value] });

    return { done: false, value: record };
  }

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await pullRecord();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

export async function selectRecord({ fs, dir, query }) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  let entries = [];

  for (const query of queries) {
    const stream = await selectRecordStreamPull({ fs, dir, query });

    for await (const record of stream) {
      entries.push(record);
    }
  }

  return entries;
}
