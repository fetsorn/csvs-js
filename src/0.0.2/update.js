import csv from "papaparse";
import Store from "./store.js";
import { recordToRelationMap, findCrown } from "./bin.js";

/** Class representing a dataset record. */
export default class Update {
  /**
   * .
   * @type {Store}
   */
  #store;

  /**
   * Create a dataset instance.
   * @param {Object} callback - The callback that returns a key.
   * @param {CSVS~readFileCallback} callback.readFile - The callback that reads db.
   * @param {CSVS~writeFileCallback} callback.writeFile - The callback that writes db.
   * @param {CSVS~randomUUIDCallback} callback.randomUUID - The callback that returns a key.
   */
  constructor(callback) {
    this.#store = new Store(callback);
  }

  /**
   * This updates the dataset record.
   * @name update
   * @function
   * @param {object} record - A dataset record.
   * @returns {object} - A dataset record.
   */
  async update(record) {
    await this.#store.readSchema();

    // exit if record is undefined
    if (record === undefined) return;

    // TODO find base value if _ is object or array
    // TODO exit if no base field or invalid base value
    const base = record._;

    await this.#store.read(base);

    if (base === "_") {
      this.#updateSchema(record);
    } else {
      this.#updateRecord(record);
    }

    // TODO if query result equals record skip
    // otherwise write output
    await this.#store.write();
  }

  /**
   * This saves the schema to the dataset.
   * @name updateSchema
   * @param {object} record - A dataset record.
   * @function
   */
  #updateSchema(record) {
    // for each field, for each value
    const trunks = Object.keys(record).filter((key) => key !== "_");

    // list of
    const relations = trunks.reduce((acc, trunk) => {
      const values = record[trunk];

      // TODO: handle if value is literal, expand?
      // TODO: handle if value is object, expand?
      // TODO: handle if value is array of objects?
      // assume value is array of literals
      const relations = values.map((branch) => `${trunk},${branch}`);

      return acc.concat(relations);
    }, []);

    const contents = relations.sort().join("\n");

    // overwrite the .csvs.csv file with field,value
    this.#store.setOutput("_-_.csv", contents);
  }

  /**
   * This saves a record to the dataset.
   * @name updateRecord
   * @param {object} record - A dataset record.
   * @function
   */
  #updateRecord(record) {
    // TODO if base is array, map array to multiple records

    const base = record._;

    // build a relation map of the record. tablet -> key -> list of values
    const relationMap = recordToRelationMap(this.#store.schema, record);

    // iterate over leaves of leaves, the whole crown
    const crown = findCrown(this.#store.schema, base);

    crown.forEach((branch) => {
      const { trunk } = this.#store.schema[branch];

      const pair = `${trunk}-${branch}.csv`;

      const tablet = this.#store.getCache(pair);

      let isWrite = false;

      // for each line of tablet
      csv.parse(tablet, {
        step: (row) => {
          // ignore empty newline
          if (row.data.length === 1 && row.data[0] === "") return;

          const [key] = row.data;

          const keys = Object.keys(relationMap[pair] ?? {});

          const lineMatchesKey = keys.includes(key);

          if (lineMatchesKey) {
            // prune if line matches a key from relationMap
          } else {
            const dataEscaped = row.data.map((str) =>
              str.replace(/\n/g, "\\n"),
            );

            const line = csv.unparse([dataEscaped], { newline: "\n" });

            // append line to output
            this.#store.appendOutput(pair, line);
          }
        },
        complete: () => {
          // if flag unset and relation map not fully popped, set flag
          if (!isWrite) {
            const recordHasNewValues =
              Object.keys(relationMap[pair] ?? {}).length > 0;

            if (recordHasNewValues) {
              isWrite = true;
            }
          }

          // don't write tablet if changeset doesn't have anything on it
          // if flag set, append relation map to pruned
          if (isWrite) {
            // for each key in the changeset
            const keys = Object.keys(relationMap[pair]);

            const relations = keys.reduce((acc, key) => {
              // for each key value in the changeset
              const values = relationMap[pair][key];

              const keyRelations = values.map((value) => [key, value]);

              const keyRelationsEscaped = keyRelations.map((strings) =>
                strings.map((str) => str.replace(/\n/g, "\\n")),
              );

              return [...keyRelationsEscaped, ...acc];
            }, []);

            const lines = csv.unparse(relations, { newline: "\n" });

            // append remaining relations to output
            this.#store.appendOutput(pair, lines);
          } else {
            // TODO: remove this check
            if (tablet !== "" && tablet !== undefined && tablet !== "\n") {
              // otherwise reset output to not change it
              this.#store.setOutput(pair, tablet);
            }
          }
        },
      });
    });
  }
}
