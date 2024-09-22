import stream from "stream";
import { promisify } from "util";
import Store from "../store.js";
import { planPrune } from "./strategy.js";
import { pruneTablet } from "./tablet.js";

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
   * This deletes a record from the dataset.
   * @name updateRecord
   * @param {object} record - A dataset record.
   * @function
   */
  #deleteRecord(schema, cache, appendOutput) {
    return new stream.Writable({
      objectMode: true,

      write(record, encoding, callback) {
        const strategy = planPrune(schema, record);

        strategy.forEach((tablet) => {
          pruneTablet(tablet, cache, appendOutput);
        });

        callback();
      },
    });
  }

  /**
   * This deletes the dataset record.
   * @name delete
   * @param {object} record - A dataset record.
   * @function
   */
  async delete(records) {
    await this.#store.readSchema();

    // exit if record is undefined
    if (records === undefined) return;

    let rs = Array.isArray(records) ? records : [records];

    const base = rs[0]._;

    await this.#store.read(base);

    const queryStream = stream.Readable.from(rs);

    const writeStream = this.#deleteRecord(
      this.#store.schema,
      this.#store.cache,
      this.#store.appendOutput.bind(this.#store),
    );

    const pipeline = promisify(stream.pipeline);

    await pipeline([queryStream, writeStream]);

    await this.#store.write();
  }
}
