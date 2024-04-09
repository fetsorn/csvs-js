import { prune, pruneValue } from "./grep.js";
import Store from "./store.js";
import { digestMessage } from "../random.js";

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

    const branchKey = await this.#remove(record);

    await this.#unlinkTrunks(record._, record.UUID ?? branchKey);

    await this.#unlinkLeaves(record._, record.UUID ?? branchKey);

    await this.#store.write();
  }

  /**
   * This saves an record to the dataset.
   * @name save
   * @param {object} record - A dataset record.
   * @function
   * @returns {object} - A dataset record with new key.
   */
  async #save(record) {
    const branch = record._;

    const branchType = this.#store.schema[branch].type;

    const branchValue =
      branchType === "array" || branchType === "object"
        ? record
        : record[branch];

    let branchKey;

    if (record.UUID) {
      branchKey = record.UUID;
    } else if (
      this.#store.schema[branch].trunk === undefined ||
      branchType === "array" ||
      branchType === "object"
    ) {
      branchKey = await digestMessage(await this.#callback.randomUUID());
    } else if (branchType === "hash") {
      branchKey = branchValue;
    } else {
      branchKey = await digestMessage(branchValue);
    }

    // add to props if needed
    const indexPath = `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`;

    const branchValueEscaped =
      this.#store.schema[branch].type === "string"
        ? JSON.stringify(branchValue)
        : branchValue;

    const isKey =
      branchType === "hash" ||
      branchType === "object" ||
      branchType === "array";

    const indexLine = isKey
      ? `${branchKey}\n`
      : `${branchKey},${branchValueEscaped}\n`;

    const indexFile =
      this.#store.getOutput(indexPath) ?? this.#store.getCache(indexPath);

    if (indexFile === "\n") {
      this.#store.setOutput(indexPath, indexLine);
    } else if (!indexFile.includes(indexLine)) {
      const indexPruned = prune(indexFile, branchKey);

      if (indexPruned === "\n") {
        this.#store.setOutput(indexPath, indexLine);
      } else {
        this.#store.setOutput(indexPath, `${indexPruned}\n${indexLine}`);
      }
    }

    await this.#linkLeaves(record, branchKey);

    return { UUID: branchKey, ...record };
  }

  /**
   * This removes an record from the dataset.
   * @name remove
   * @param {object} record - A dataset record.
   * @function
   */
  async #remove(record) {
    const branch = record._;

    const branchType = this.#store.schema[branch].type;

    if (
      branchType === "hash" ||
      branchType === "object" ||
      branchType === "array"
    ) {
      if (record.UUID === undefined) {
        throw Error(
          `failed to remove ${branchType} branch ${branch} record without key`,
        );
      }
      return undefined;
    }

    const branchValue = record[branch];

    let branchKey;

    if (record.UUID) {
      branchKey = record.UUID;
    } else if (this.#store.schema[branch].trunk === undefined) {
      throw Error(`failed to remove root branch ${branch} record without key`);
    } else {
      branchKey = await digestMessage(branchValue);
    }

    // prune props if exist
    const indexPath = `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`;

    const indexFile =
      this.#store.getOutput(indexPath) ?? this.#store.getCache(indexPath);

    const indexPruned = prune(indexFile, branchKey);

    this.#store.setOutput(indexPath, indexPruned);

    return branchKey;
  }

  /**
   * This links all leaves to the branch.
   * @name linkLeaves
   * @param {object} record - A dataset record.
   * @param {object} branchKey - The branch key.
   * @function
   */
  async #linkLeaves(record, branchKey) {
    const branch = record._;

    const branchType = this.#store.schema[branch].type;

    const leaves = Object.keys(this.#store.schema).filter(
      (b) =>
        this.#store.schema[b].trunk === branch &&
        this.#store.schema[b].type !== "regex",
    );

    if (this.#store.schema[branch].type === "array") {
      // unlink all items from branch for refresh
      await this.#unlinkLeaves(branch, branchKey);
    }

    // map leaves
    await Promise.all(
      leaves.map(async (leaf) => {
        // for (const leaf of leaves) {
        const recordLeaves =
          branchType === "array"
            ? record.items.map((item) => item._)
            : Object.keys(record);

        if (recordLeaves.includes(leaf)) {
          // link if in the record
          if (this.#store.schema[branch].type === "array") {
            const leafItems = record.items.filter((item) => item._ === leaf);

            await Promise.all(
              leafItems.map(async (item) => {
                // for (const item of leafItems) {
                await this.#linkTrunk(branchKey, item);
              }),
            );
          } else {
            const leafRecord =
              this.#store.schema[leaf].type === "array" ||
              this.#store.schema[leaf].type === "object"
                ? record[leaf]
                : Object.keys(record)
                    .filter((b) => this.#store.schema[b]?.trunk === leaf)
                    .reduce((acc, key) => ({ [key]: record[key], ...acc }), {
                      _: leaf,
                      [leaf]: record[leaf],
                    });

            await this.#linkTrunk(branchKey, leafRecord);
          }
        } else {
          /// unlink if not in the record
          await this.#unlinkTrunk(branchKey, leaf);
        }
      }),
    );
    // }
  }

  /**
   * This links an record to a trunk key.
   * @name linkTrunk
   * @param {object} trunkKey - The trunk key.
   * @param {object} record - A dataset record.
   * @function
   */
  async #linkTrunk(trunkKey, record) {
    const branch = record._;

    const { trunk } = this.#store.schema[branch];
    // save if needed
    const { UUID: branchKey } = await this.#save(record);

    // add to pairs
    const pairLine = `${trunkKey},${branchKey}\n`;

    const pairPath = `metadir/pairs/${trunk}-${branch}.csv`;

    const pairFile =
      this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

    if (pairFile === "\n") {
      this.#store.setOutput(pairPath, pairLine);
    } else if (!pairFile.includes(pairLine)) {
      if (this.#store.schema[trunk].type === "array") {
        this.#store.setOutput(pairPath, pairFile + pairLine);
      } else {
        const pairPruned = prune(pairFile, trunkKey);

        if (pairPruned === "\n") {
          this.#store.setOutput(pairPath, pairLine);
        } else {
          this.#store.setOutput(pairPath, `${pairPruned}\n${pairLine}`);
        }
      }
    }
  }

  /**
   * This unlinks an record from a trunk key.
   * @name unlinkTrunk
   * @param {object} trunkKey - The trunk key.
   * @param {object} record - A dataset record.
   * @function
   */
  async #unlinkTrunk(trunkKey, branch) {
    // prune pairs file for trunk key
    const pairPath = `metadir/pairs/${this.#store.schema[branch].trunk}-${branch}.csv`;

    // if file, prune it for trunk key
    const pairFile = this.#store.getCache(pairPath);

    if (pairFile === "\n" || pairFile === "") {
      return;
    }

    const pairPruned = prune(pairFile, trunkKey);

    this.#store.setOutput(pairPath, `${pairPruned}\n`);
  }

  /**
   * This unlinks a branch key from all trunk keys.
   * @name unlinkTrunks
   * @param {string} branch - A branch name.
   * @param {string} branchKey - A branch key.
   * @function
   */
  async #unlinkTrunks(branch, branchKey) {
    const { trunk } = this.#store.schema[branch];

    // unlink trunk if it exists
    if (trunk !== undefined) {
      // find trunkKeys
      const pairPath = `metadir/pairs/${trunk}-${branch}.csv`;

      const pairFile = this.#store.getCache(pairPath);

      if (pairFile === "\n" || pairFile === "" || pairFile === undefined) {
        return;
      }

      const pairPruned = pruneValue(pairFile, branchKey);

      this.#store.setOutput(pairPath, `${pairPruned}\n`);
    }
  }

  /**
   * This unlinks a branch key from all leaf keys.
   * @name unlinkLeaves
   * @param {string} branch - A branch name.
   * @param {string} branchKey - A branch key.
   * @function
   */
  async #unlinkLeaves(branch, branchKey) {
    // find all leaves
    const leaves = Object.keys(this.#store.schema).filter(
      (b) =>
        this.#store.schema[b].trunk === branch &&
        this.#store.schema[b].type !== "regex",
    );

    await Promise.all(
      leaves.map(async (leaf) => {
        await this.#unlinkTrunk(branchKey, leaf);
      }),
    );
  }
}
