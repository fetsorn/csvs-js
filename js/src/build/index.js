import path from "path";
import { planBuild } from "./strategy.js";
import { buildTablet } from "./tablet.js";
import { buildSchema } from "../schema/index.js";
import { readProse } from "../prose/index.js";

/**
 * This returns a list of records
 * @name selectRecord
 * @function
 * @returns {Object[]}
 */
export async function buildRecord({
  fs,
  bare = false,
  dir,
  csvsdir = bare ? dir : path.join(dir, "csvs"),
  query,
  schema: schemaCached,
  prose = false,
}) {
  const schema =
    schemaCached ?? (await buildSchema({ fs, bare, dir, csvsdir }));

  const strategy = planBuild(schema, query[0]);

  let entry = query[0];

  for (const tablet of strategy) {
    entry = await buildTablet(fs, csvsdir, tablet, entry);
  }

  // if nothing is found, return input unchanged

  if (prose) {
    entry = await withProse(fs, csvsdir, entry);
  }

  return entry;
}

async function withProse(fs, csvsdir, entry) {
  const baseValue = entry[entry._];

  const prosePartial =
    baseValue !== undefined && typeof baseValue === "string"
      ? await readProse(fs, csvsdir, baseValue)
      : {};

  const keys = Object.keys(entry).filter((k) => k !== "_");

  const leafEntries = await Promise.all(
    keys.map(async (key) => {
      const val = entry[key];

      if (
        val !== null &&
        typeof val === "object" &&
        !Array.isArray(val) &&
        val._
      ) {
        return [key, await withProse(fs, csvsdir, val)];
      }

      if (Array.isArray(val)) {
        const items = await Promise.all(
          val.map(async (item) => {
            if (item !== null && typeof item === "object" && item._) {
              return withProse(fs, csvsdir, item);
            }

            if (typeof item === "string") {
              const itemProse = await readProse(fs, csvsdir, item);

              if (Object.keys(itemProse).length > 0) {
                return { _: key, [key]: item, ...itemProse };
              }
            }

            return item;
          }),
        );

        return [key, items];
      }

      if (typeof val === "string" && key !== entry._) {
        const valProse = await readProse(fs, csvsdir, val);

        if (Object.keys(valProse).length > 0) {
          return [key, { _: key, [key]: val, ...valProse }];
        }
      }

      return [key, val];
    }),
  );

  return { ...entry, ...Object.fromEntries(leafEntries), ...prosePartial };
}
