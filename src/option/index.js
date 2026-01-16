import path from "path";
import { ReadableStream } from "@swimburger/isomorphic-streams";
import { buildSchema } from "../schema/index.js";
import { planSelect } from "./strategy.js";
import { optionTabletStream } from "./tablet.js";

export async function selectOptionStream({
  fs,
  bare = false,
  dir,
  query,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  const schema = await buildSchema({ fs, bare, dir, csvsdir });

  const strategy = planSelect(schema, query)[Symbol.iterator]();

  let tabletIterator;

  let tabletsOver = false;

  let state = { query, matchMap: new Map() };

  async function nextTablet() {
    const { done, value } = await strategy.next();

    if (done) {
      tabletsOver = true;

      return;
    }

    const tabletStream = await optionTabletStream(fs, csvsdir, value, state);

    tabletIterator = tabletStream[Symbol.asyncIterator]();
  }

  async function pullTablet() {
    if (tabletIterator === undefined) await nextTablet();

    const { done, value } = await tabletIterator.next();

    if (done) {
      await nextTablet();

      if (tabletsOver) {
        return null;
      }

      return pullTablet();
    }

    const { last, ...stateNew } = value;

    state = stateNew;

    return last;
  }

  return new ReadableStream({
    async pull(controller) {
      const entry = await pullTablet();

      if (entry === null) {
        controller.close();
      } else {
        controller.enqueue(entry);
      }
    },
  });
}

export async function selectOption({
  fs,
  bare = false,
  dir,
  query,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
}) {
  // exit if record is undefined
  if (query === undefined) return;

  const queries = Array.isArray(query) ? query : [query];

  let entries = [];

  for (const query of queries) {
    let optionStream = await selectOptionStream({
      fs,
      bare,
      dir,
      csvsdir,
      query,
    });

    for await (const option of optionStream) {
      entries.push(option);
    }
  }

  return entries;
}
