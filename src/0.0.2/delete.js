import csv from "papaparse";
import { findCrown } from "./schema.js";
import Store from "./store.js";
import { recordToRelationMap } from "./bin.js";

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

    // prune `,value$` in the `trunk-branch.csv` file
    // await this.#unlinkTrunks(base, record[base]);

    // prune `^value,` in all `branch-{leaf}.csv` files
    // await this.#unlinkLeaves(base, record[base]);

    await this.#store.write();
  }

  // /**
  //  * This unlinks a branch value from all trunk values.
  //  * @name unlinkTrunks
  //  * @param {string} branch - A branch name.
  //  * @param {string} value - A branch value.
  //  * @function
  //  */
  // async #unlinkTrunks(branch, value) {
  //   const { trunk } = this.#store.schema[branch];

  //   // unlink trunk if it exists
  //   if (trunk !== undefined) {
  //     // find trunkKeys
  //     const pairPath = `${trunk}-${branch}.csv`;

  //     const pairFile = this.#store.getCache(pairPath);

  //     if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
  //       return;
  //     }

  //     const pairPruned = pruneValue(pairFile, value);

  //     this.#store.setOutput(pairPath, `${pairPruned}\n`);
  //   }
  // }

  // /**
  //  * This unlinks a branch value from all values of a leaf branch.
  //  * @name unlinkLeaf
  //  * @param {string} branch - A branch name.
  //  * @param {string} value - A branch value.
  //  * @param {string} leaf - A leaf branch.
  //  * @function
  //  */
  // async #unlinkLeaf(branch, value, leaf) {
  //   const pairPath = branch === '_'
  //     ? '_-_.csv'
  //     : `${branch}-${leaf}.csv`;

  //   const pairFile = this.#store.getCache(pairPath);
  //   // const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

  //   if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
  //     return;
  //   }

  //   const pairPruned = pruneKey(pairFile, value);

  //   this.#store.setOutput(pairPath, `${pairPruned}\n`);
  // }

  // /**
  //  * This unlinks a branch value from all leaf values.
  //  * @name unlinkLeaves
  //  * @param {string} branch - A branch name.
  //  * @param {string} value - A branch value.
  //  * @function
  //  */
  // async #unlinkLeaves(branch, value) {
  //   // find all leaves
  //   const leaves = Object.keys(this.#store.schema)
  //     .filter((b) => this.#store.schema[b].trunk === branch);

  //   await Promise.all(leaves.map(
  //     async (leaf) => this.#unlinkLeaf(branch, value, leaf),
  //   ));
  // }
}
