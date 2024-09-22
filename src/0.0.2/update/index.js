import stream from "stream";
import { promisify } from "util";
import Store from "../store.js";
import { findCrown } from "../schema.js";
import { recordToRelationMap } from "./query.js";
import { updateTablet } from "./tablet.js";

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

  async #updateSchema(cache, appendOutput) {
    // writable
    return new stream.Writable({
      objectMode: true,

      write(record, encoding, callback) {
        const filename = `_-_.csv`;

        const relations = Object.fromEntries(
          Object.entries(record)
            .filter(([key]) => key !== "_")
            .map(([key, value]) => [
              key,
              Array.isArray(value) ? value : [value],
            ]),
        );

        updateTablet({ [filename]: "" }, relations, filename, appendOutput);

        callback();
      },
    });
  }

  async #updateRecord(schema, cache, appendOutput) {
    // writable
    return new stream.Writable({
      objectMode: true,

      write(record, encoding, callback) {
        const base = record._;

        // build a relation map of the record. tablet -> key -> list of values
        const relationMap = recordToRelationMap(schema, record);

        // for each branch in crown
        const crown = findCrown(schema, base);

        for (const branch of crown) {
          const { trunk } = schema[branch];

          const filename = `${trunk}-${branch}.csv`;

          updateTablet(cache, relationMap[filename], filename, appendOutput);
        }

        callback();
      },

      close() {},

      abort(err) {
        console.log("Sink error:", err);
      },
    });
  }

  /**
   * This updates the dataset record.
   * @name update
   * @function
   * @param {object} record - A dataset record.
   * @returns {object} - A dataset record.
   */
  async update(records) {
    await this.#store.readSchema();

    // exit if record is undefined
    if (records === undefined) return;

    let rs = Array.isArray(records) ? records : [records];

    // TODO find base value if _ is object or array
    // TODO exit if no base field or invalid base value
    const base = rs[0]._;

    await this.#store.read(base);

    const queryStream = stream.Readable.from(rs);

    const writeStream =
      base === "_"
        ? await this.#updateSchema(
            this.#store.cache,
            this.#store.appendOutput.bind(this.#store),
            rs,
          )
        : await this.#updateRecord(
            this.#store.schema,
            this.#store.cache,
            this.#store.appendOutput.bind(this.#store),
            rs,
          );

    const pipeline = promisify(stream.pipeline);

    await pipeline([queryStream, writeStream]);

    // TODO if query result equals record skip
    // otherwise write output
    await this.#store.write();
  }
}
