import csv from "papaparse";
import Store from "./store.js";

/** Class representing a dataset record. */
export default class Delete {
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
   * This deletes the dataset record.
   * @name delete
   * @param {object} record - A dataset record.
   * @function
   */
  async delete(record) {
    await this.#store.readSchema();

    const base = record._;

    await this.#store.read(base);

    this.#deleteRecord(record);

    await this.#store.write();
  }

  /**
   * This deletes a record from the dataset.
   * @name updateRecord
   * @param {object} record - A dataset record.
   * @function
   */
  #deleteRecord(record) {
    // TODO: handle weird case when value is array
    // { _: a, a: [ { _: a, a: a1 }, { _: a, a: a1 } ] }
    const base = record._;

    const baseValue = record[base];

    const { trunk } = this.#store.schema[base];

    if (trunk !== undefined) {
      const pair = `${trunk}-${base}.csv`;

      const tablet = this.#store.getCache(pair);

      csv.parse(tablet, {
        step: (row) => {
          // ignore empty newline
          if (row.data.length === 1 && row.data[0] === "") return;

          const [, value] = row.data;

          const isMatch = value === baseValue;

          if (isMatch) {
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
      });
    }

    const leaves = Object.keys(this.#store.schema).filter(
      (branch) => this.#store.schema[branch].trunk === base,
    );

    // csv.parse each base-leaf, prune all matches
    for (const leaf of leaves) {
      const pair = `${base}-${leaf}.csv`;

      const tablet = this.#store.getCache(pair);

      if (tablet) {
        this.#store.appendOutput(pair, "");
      }

      csv.parse(tablet, {
        step: (row) => {
          // ignore empty newline
          if (row.data.length === 1 && row.data[0] === "") return;

          const [key] = row.data;

          const isMatch = key === baseValue;

          if (isMatch) {
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
      });
    }
  }
}
