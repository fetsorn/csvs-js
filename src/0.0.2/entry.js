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
   * This updates the database entry.
   * @name update
   * @function
   * @param {object} entry - A database entry.
   * @returns {object} - A database entry.
   */
  async update(entry) {
    await this.#store.readSchema();

    await this.#store.read(entry._);

    const value = await this.#save(entry);

    await this.#store.write();

    return value;
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
   * This saves an entry to the database.
   * @name save
   * @param {object} entry - A database entry.
   * @function
   * @returns {object} - A database entry with new UUID.
   */
  async #save(entry) {
    const branch = entry._;

    const branchValue = entry['|'] ?? await digestMessage(await this.#callback.randomUUID());

    await this.#linkLeaves(entry, branchValue);

    return { '|': branchValue, ...entry };
  }

  /**
   * This links all leaves to the branch.
   * @name linkLeaves
   * @param {object} entry - A database entry.
   * @param {object} branchUUID - The branch UUID.
   * @function
   */
  async #linkLeaves(entry, branchValue) {
    const branch = entry._;

    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch);

    // for each leaf branch
    // await Promise.all(leaves.map(async (leaf) => {
    for (const leaf of leaves) {
      const hasLeaf = Object.prototype.hasOwnProperty.call(entry, leaf)

      if (hasLeaf) {
        // move this normalization of data structure elsewhere
        const leafValue = typeof entry[leaf] === "string"
              ? [ { _: leaf, "|": entry[leaf] } ]
              : [ entry[leaf] ].flat()

        await Promise.all(leafValue.map(async (item) => {
          await this.#linkTrunk(branchValue, item);
        }))
      }
    // }));
    }
  }

  /**
   * This links an entry to a trunk UUID.
   * @name linkTrunk
   * @param {object} trunkValue - The trunk value.
   * @param {object} entry - A database entry.
   * @function
   */
  async #linkTrunk(trunkValue, entry) {
    const branch = entry._;

    const { trunk } = this.#store.schema[branch];

    // save if needed
    const { '|': branchValue } = await this.#save(entry);

    // add to pairs
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
    // const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

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
  }
}
