/* eslint-disable import/extensions */
import { takeKeys } from './metadir.js';
import { grep, pruneValue, pruneKey } from './grep.js';
import Store from './store.js';
import { digestMessage } from '../random.js';

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

    await this.#store.read(record._);

    const value = await this.#save(record);

    await this.#store.write();

    return value;
  }

  /**
   * This deletes the dataset record.
   * @name delete
   * @param {object} record - A dataset record.
   * @function
   */
  async delete(record) {
    await this.#store.readSchema();

    await this.#store.read(record._);

    // prune `,value$` in the `trunk-branch.csv` file
    await this.#unlinkTrunks(record._, record[record._]);

    // prune `^value,` in all `branch-{leaf}.csv` files
    await this.#unlinkLeaves(record._, record[record._]);

    await this.#store.write();
  }

  /**
   * This saves an record to the dataset.
   * @name save
   * @param {object} record - A dataset record.
   * @function
   * @returns {object} - A dataset record, value added if there was none.
   */
  async #save(record) {
    const branch = record._;

    const branchValue = record[branch] ?? await digestMessage(await this.#callback.randomUUID());

    await this.#linkLeaves(record, branchValue);

    return { [branch]: branchValue, ...record };
  }

  /**
   * This links all leaves to the branch.
   * @name linkLeaves
   * @param {object} record - A dataset record.
   * @param {object} branchKey - The branch key.
   * @function
   */
  async #linkLeaves(record, branchValue) {
    const branch = record._;

    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch);

    // for each leaf branch
    await Promise.all(leaves.map(async (leaf) => {
      // unlink leaf values
      await this.#unlinkLeaf(branch, branchValue, leaf)

      const hasLeaf = Object.prototype.hasOwnProperty.call(record, leaf)

      if (hasLeaf) {
        // TODO: move this normalization of data structure elsewhere
        const leafValue = typeof record[leaf] === "string"
              ? [ { _: leaf, [leaf]: record[leaf] } ]
              : [ record[leaf] ].flat()

        await Promise.all(leafValue.map(async (item) => {
          await this.#linkTrunk(branchValue, item);
        }))
      }
    }));
  }

  /**
   * This links a record to a trunk value.
   * @name linkTrunk
   * @param {object} trunkValue - The trunk value.
   * @param {object} record - A dataset record.
   * @function
   */
  async #linkTrunk(trunkValue, record) {
    const branch = record._;

    const { trunk } = this.#store.schema[branch];

    // save if needed
    const { [branch]: branchValue } = await this.#save(record);

    // add to pairs
    // TODO: serialize csv with a third-party library
    // TODO: escape values
    const pairLine = `${trunkValue},${branchValue}\n`;

    const pairPath = `${trunk}-${branch}.csv`;

    const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

    if (pairFile === '\n') {
      this.#store.setOutput(pairPath, pairLine);
    } else if (!pairFile.includes(pairLine)) {
      this.#store.setOutput(pairPath, `${pairFile}\n${pairLine}`);
    }
  }

  /**
   * This unlinks a branch value from all trunk values.
   * @name unlinkTrunks
   * @param {string} branch - A branch name.
   * @param {string} branchValue - A branch value.
   * @function
   */
  async #unlinkTrunks(branch, branchValue) {
    const { trunk } = this.#store.schema[branch];

    // unlink trunk if it exists
    if (trunk !== undefined) {
      // find trunkKeys
      const pairPath = `${trunk}-${branch}.csv`;

      const pairFile = this.#store.getCache(pairPath);

      if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
        return;
      }

      const pairPruned = pruneValue(pairFile, branchValue);

      this.#store.setOutput(pairPath, `${pairPruned}\n`);
    }
  }

  /**
   * This unlinks a branch value from all values of a leaf branch.
   * @name unlinkLeaf
   * @param {string} branch - A branch name.
   * @param {string} branchValue - A branch value.
   * @param {string} leaf - A leaf branch.
   * @function
   */
  async #unlinkLeaf(branch, branchValue, leaf) {
      const pairPath = `${branch}-${leaf}.csv`;

      const pairFile = this.#store.getCache(pairPath);
      // const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

      if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
        return;
      }

      const pairPruned = pruneKey(pairFile, branchValue);

      this.#store.setOutput(pairPath, `${pairPruned}\n`);
  }

  /**
   * This unlinks a branch value from all leaf values.
   * @name unlinkLeaves
   * @param {string} branch - A branch name.
   * @param {string} branchValue - A branch value.
   * @function
   */
  async #unlinkLeaves(branch, branchValue) {
    // find all leaves
    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch);

    await Promise.all(leaves.map(
      async (leaf) => this.#unlinkLeaf(branch, branchValue, leaf)
    ));
  }
}
