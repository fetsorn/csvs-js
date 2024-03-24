/* eslint-disable import/extensions */
import { takeKeys } from './metadir.js';
import { grep, pruneValue, pruneKey } from './grep.js';
import Store from './store.js';
import { condense } from './schema.js';
import { digestMessage } from '../random.js';
import { stringify } from 'csv-stringify/sync';

/** Class representing a dataset record. */
export default class Record {
  /**
   * .
   * @type {Object}
   */
  #callback;

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
    this.#callback = callback;

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

    const base = (typeof record._ === "object" || Array.isArray(record._))
          ? "_"
          : record._;

    await this.#store.read(base);

    const recordNew = await this.#save(base, record);

    await this.#store.write();

    return recordNew;
  }

  /**
   * This deletes the dataset record.
   * @name delete
   * @param {object} record - A dataset record.
   * @function
   */
  async delete(record) {
    await this.#store.readSchema();

    const base = (typeof record._ === "object" || Array.isArray(record._))
          ? "_"
          : record._;

    await this.#store.read(base);

    // prune `,value$` in the `trunk-branch.csv` file
    await this.#unlinkTrunks(base, record[base]);

    // prune `^value,` in all `branch-{leaf}.csv` files
    await this.#unlinkLeaves(base, record[base]);

    await this.#store.write();
  }

  async #saveSchema(base, record) {
    const baseValue = record[base]

    const leaves = [...new Set([...Object.keys(record), ...Object.keys(this.#store.schema)])]

    // for each leaf branch
    const leafLists = await Promise.all(leaves.map(async (leaf) => {
      // unlink leaf values
      await this.#unlinkLeaf(base, baseValue, leaf)

      const recordHasLeaf = Object.prototype.hasOwnProperty.call(record, leaf)

      // omit the "_,_" line
      const omittedCase = leaf === "_" && record[leaf] === "_"

      if (recordHasLeaf && !omittedCase) {
        // expand condensed data structure into an array of objects
        const leafRecords = typeof record[leaf] === "string"
              ? [ { _: leaf, [leaf]: record[leaf] } ]
              : [ record[leaf] ].flat()

        const leafRecordsNew = await Promise.all(leafRecords.map(async (leafRecordRaw) => {
          // expand condensed data structure into an object
          const leafRecord = typeof leafRecordRaw === "string"
                ? { _: leaf, [leaf]: leafRecordRaw }
                : leafRecordRaw;

          // save if needed
          const { [leaf]: leafValue } = leafRecord

          // add to pairs
          const pairLine = stringify([[leaf, leafValue]], {eof: false})

          const pairLineEscaped = pairLine.replace(/\n/g, "\\n")

          const pairPath = "_-_.csv"

          const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

          if (pairFile === undefined || pairFile === '\n') {
            this.#store.setOutput(pairPath, pairLineEscaped);
          } else if (!pairFile.includes(pairLine)) {
            this.#store.setOutput(pairPath, `${pairFile}\n${pairLineEscaped}`);
          }

          return { [leaf]: leafValue, ...leafRecord }
        }))

        return { _: leaf, [leaf]: leafRecordsNew.filter(Boolean) }
      }
    }));

    const recordNew = leafLists.filter(Boolean).reduce(
      (acc, {_: leaf, [leaf]: leafRecords}) => ({
        // condensed expanded data structure
        [leaf]: condense(this.#store.schema, leaf, leafRecords), ...acc
      }),
      { _: base, [base]: baseValue }
    )

    return recordNew;
  }

  /**
   * This saves a record to the dataset.
   * @name save
   * @param {string} base - A branch.
   * @param {object} record - A dataset record.
   * @function
   * @returns {object} - A dataset record, value added if there was none.
   */
  async #save(base, record) {
    const baseValue = record[base] ?? await digestMessage(await this.#callback.randomUUID());

    const leaves = base === "_"
          ? [...new Set([...Object.keys(record), ...Object.keys(this.#store.schema)])]
          : Object.keys(this.#store.schema)
                  .filter((b) => this.#store.schema[b].trunk === base);

    // for each leaf branch
    const leafLists = await Promise.all(leaves.map(async (leaf) => {
      // unlink leaf values
      await this.#unlinkLeaf(base, baseValue, leaf)

      const recordHasLeaf = Object.prototype.hasOwnProperty.call(record, leaf)

      // omit the "_,_" line
      const omittedCase = leaf === "_" && record[leaf] === "_"

      if (recordHasLeaf && !omittedCase) {
        // expand condensed data structure into an array of objects
        const leafRecords = typeof record[leaf] === "string"
              ? [ { _: leaf, [leaf]: record[leaf] } ]
              : [ record[leaf] ].flat()

        const leafRecordsNew = await Promise.all(leafRecords.map(async (leafRecordRaw) => {
          // expand condensed data structure into an object
          const leafRecord = typeof leafRecordRaw === "string"
                ? { _: leaf, [leaf]: leafRecordRaw }
                : leafRecordRaw;

          // save if needed
          const { [leaf]: leafValue } = base === "_"
                ? leafRecord
                : await this.#save(leaf, leafRecord);

          // add to pairs
          const pairLine = base === "_"
                ? stringify([[leaf, leafValue]], {eof: false})
                : stringify([[baseValue, leafValue]], {eof: false})

          const pairLineEscaped = pairLine.replace(/\n/g, "\\n")

          const pairPath = base === "_"
                ? "_-_.csv"
                : `${base}-${leaf}.csv`;

          const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

          if (pairFile === undefined || pairFile === '\n') {
            this.#store.setOutput(pairPath, pairLineEscaped);
          } else if (!pairFile.includes(pairLine)) {
            this.#store.setOutput(pairPath, `${pairFile}\n${pairLineEscaped}`);
          }

          return { [leaf]: leafValue, ...leafRecord }
        }))

        return { _: leaf, [leaf]: leafRecordsNew.filter(Boolean) }
      }
    }));

    const recordNew = leafLists.filter(Boolean).reduce(
      (acc, {_: leaf, [leaf]: leafRecords}) => ({
        // condensed expanded data structure
        [leaf]: condense(this.#store.schema, leaf, leafRecords), ...acc
      }),
      { _: base, [base]: baseValue }
    )

    return recordNew;
  }

  /**
   * This unlinks a branch value from all trunk values.
   * @name unlinkTrunks
   * @param {string} branch - A branch name.
   * @param {string} value - A branch value.
   * @function
   */
  async #unlinkTrunks(branch, value) {
    const { trunk } = this.#store.schema[branch];

    // unlink trunk if it exists
    if (trunk !== undefined) {
      // find trunkKeys
      const pairPath = `${trunk}-${branch}.csv`;

      const pairFile = this.#store.getCache(pairPath);

      if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
        return;
      }

      const pairPruned = pruneValue(pairFile, value);

      this.#store.setOutput(pairPath, `${pairPruned}\n`);
    }
  }

  /**
   * This unlinks a branch value from all values of a leaf branch.
   * @name unlinkLeaf
   * @param {string} branch - A branch name.
   * @param {string} value - A branch value.
   * @param {string} leaf - A leaf branch.
   * @function
   */
  async #unlinkLeaf(branch, value, leaf) {
      const pairPath = branch === "_"
            ? "_-_.csv"
            : `${branch}-${leaf}.csv`;

      const pairFile = this.#store.getCache(pairPath);
      // const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

      if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
        return;
      }

      const pairPruned = pruneKey(pairFile, value);

      this.#store.setOutput(pairPath, `${pairPruned}\n`);
  }

  /**
   * This unlinks a branch value from all leaf values.
   * @name unlinkLeaves
   * @param {string} branch - A branch name.
   * @param {string} value - A branch value.
   * @function
   */
  async #unlinkLeaves(branch, value) {
    // find all leaves
    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch);

    await Promise.all(leaves.map(
      async (leaf) => this.#unlinkLeaf(branch, value, leaf)
    ));
  }
}
