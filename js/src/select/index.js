import path from "path";
import { queryRecordStream } from "../query/index.js";
import { selectOptionStream } from "../option/index.js";
import { buildRecord } from "../build/index.js";
import { selectSchema } from "../schema/index.js";
import { selectVersion } from "../version/index.js";

// for backwards compatibility with push streams
export function selectRecordStream({
  fs,
  bare = false,
  dir,
  light,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  return new TransformStream({
    async transform(query, controller) {
      const entries = await selectRecord({
        fs,
        bare,
        dir,
        csvsdir,
        query,
        light,
      });

      for (const entry of entries) {
        controller.enqueue(entry);
      }
    },
  });
}

export function selectRecordStreamPull({
  fs,
  bare = false,
  dir,
  query,
  light,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  const queries = Array.isArray(query) ? query : [query];

  let armIndex = 0;

  let recordIterator;

  let isDone = false;

  const seen = queries.length > 1 ? new Set() : undefined;

  function currentQuery() {
    return queries[armIndex];
  }

  async function initStream() {
    const q = currentQuery();

    const hasLeaves =
      Object.keys(q).filter((key) => key !== "_" && key !== q._).length > 0;

    // decide whether we want option or query
    const recordStream = hasLeaves
      ? await queryRecordStream({ fs, bare, dir, csvsdir, query: q })
      : await selectOptionStream({ fs, bare, dir, csvsdir, query: q });

    recordIterator = recordStream[Symbol.asyncIterator]();
  }

  async function pullRecord() {
    if (isDone) {
      return { done: true, value: undefined };
    }

    const q = currentQuery();

    if (q._ === "_") {
      isDone = true;

      const schemaRecord = await selectSchema({ fs, bare, dir, csvsdir });

      return { done: false, value: schemaRecord };
    }

    if (q._ === ".") {
      isDone = true;

      const versionRecord = await selectVersion({ fs, bare, dir, csvsdir });

      return { done: false, value: versionRecord };
    }

    if (recordIterator === undefined) {
      await initStream();
    }

    const { done, value } = await recordIterator.next();

    if (done) {
      // move to next arm
      armIndex++;
      recordIterator = undefined;

      if (armIndex >= queries.length) {
        return { done: true, value: undefined };
      }

      // recurse to pull from next arm
      return pullRecord();
    }

    // deduplicate across union arms by base value
    if (seen !== undefined) {
      const baseValue = value[value._];

      if (baseValue !== undefined && seen.has(baseValue)) {
        return pullRecord();
      }

      if (baseValue !== undefined) {
        seen.add(baseValue);
      }
    }

    const record = light
      ? value
      : await buildRecord({ fs, bare, dir, csvsdir, query: [value] });

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

export async function selectRecord({
  fs,
  bare = false,
  dir,
  query,
  light,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  let entries = [];

  for (const query of queries) {
    const stream = await selectRecordStreamPull({
      fs,
      bare,
      dir,
      csvsdir,
      query,
      light,
    });

    for await (const record of stream) {
      entries.push(record);
    }
  }

  return entries;
}
