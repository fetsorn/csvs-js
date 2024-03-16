/* eslint-disable import/extensions */
import { takeUUIDs } from './metadir.js';
import { grep, prune } from './grep.js';
import Store from './store.js';
import { digestMessage } from '../random.js';

/** Class representing a database entry. */
export default class Entry {
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
   * Create a database instance.
   * @param {Object} callback - The callback that returns a UUID.
   * @param {CSVS~readFileCallback} callback.readFile - The callback that reads db.
   * @param {CSVS~writeFileCallback} callback.writeFile - The callback that writes db.
   * @param {CSVS~randomUUIDCallback} callback.randomUUID - The callback that returns a UUID.
   */
  constructor(callback) {
    this.#callback = callback;

    this.#store = new Store(callback);
  }

  /**
   * This deletes the database entry.
   * @name delete
   * @param {object} entry - A database entry.
   * @function
   */
  async delete(entry) {
    await this.#store.readSchema();

    await this.#store.read(entry._);

    await this.#unlinkTrunks(entry._, entry['|']);

    await this.#unlinkLeaves(entry._, entry['|']);

    await this.#store.write();
  }

  /**
   * This unlinks an entry from a trunk UUID.
   * @name unlinkTrunk
   * @param {string} trunkValue - The trunk value.
   * @param {object} entry - A database entry.
   * @function
   */
  async #unlinkTrunk(trunkValue, branch) {
    const { trunk } = this.#store.schema[branch];

    // prune pairs file for trunk UUID
    const pairPath = `${trunk}-${branch}.csv`;

    // if file, prune it for trunk UUID
    const pairFile = this.#store.getCache(pairPath);
    // const trunkContents = this.#store.getOutput(trunkPath) ?? this.#store.getCache(trunkPath);

    if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
      return;
    }

    const pairPruned = prune(pairFile, trunkValue);

    this.#store.setOutput(pairPath, `${pairPruned}\n`);
  }

  /**
   * This unlinks a branch UUID from all trunk UUIDs.
   * @name unlinkTrunks
   * @param {string} branch - A branch name.
   * @param {string} branchValue - A branch value.
   * @function
   */
  async #unlinkTrunks(branch, branchValue) {
    const { trunk } = this.#store.schema[branch];

    // unlink trunk if it exists
    if (trunk !== undefined) {
      // find trunkUUIDs
      const trunkLines = grep(
        `${trunk}-${branch}.csv`,
        `,${branchValue}$`,
      );

      console.log("trunkLines", trunkLines)

      const trunkUUIDs = takeUUIDs(trunkLines);

      // unlink trunk
      await Promise.all(trunkUUIDs.map(async (trunkUUID) => {
        await this.#unlinkTrunk(trunkUUID, branch);
      }));
    }
  }

  /**
   * This unlinks a branch UUID from all leaf UUIDs.
   * @name unlinkLeaves
   * @param {string} branch - A branch name.
   * @param {string} branchValue - A branch value.
   * @function
   */
  async #unlinkLeaves(branch, branchValue) {
    // find all leaves
    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch);

    await Promise.all(leaves.map(async (leaf) => {
      await this.#unlinkTrunk(branchValue, leaf);
    }));


    // leaves.forEach((leaf) => {
    //   const leafPath = `${branch}-${leaf}.csv`;

    //   const leafContents = this.#store.getOutput(leafPath) ?? this.#store.getCache(leafPath);

    //   if (leafContents) {
    //     // TODO: prune only for ^value,
    //     const leafPruned = prune(leafContents, branchValue);

    //     console.log("prune",  leafPruned)

    //     this.#store.setOutput(leafPath, leafPruned);
    //   }
    // })
  }
}
