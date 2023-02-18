/* eslint-disable import/extensions */
import { takeUUIDs } from './metadir.js';
import Store from './store.js';

/**
 * This generates a SHA-256 hashsum.
 * @name digestMessage
 * @function
 * @param {string} message - A string.
 * @returns {string} - SHA-256 hashsum.
 */
export async function digestMessage(message) {
  // encode as (utf-8) Uint8Array
  const msgUint8 = new TextEncoder().encode(message);

  // hash as buffer
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

  // convert buffer to byte array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

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
   * @param {CSVS~grepCallback} callback.grep - The callback that searches files.
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

    await this.#store.read(entry['|']);

    const { value } = await this.#save(entry);

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

    await this.#store.read(entry['|']);

    const branchUUID = await this.#remove(entry);

    await this.#unlinkTrunks(entry['|'], entry.UUID ?? branchUUID);

    await this.#unlinkLeaves(entry['|'], entry.UUID ?? branchUUID);

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
    const branch = entry['|'];

    const branchType = this.#store.schema[branch].type;

    const branchValue = branchType === 'array' || branchType === 'object'
      ? entry
      : entry[branch];

    let branchUUID;

    if (entry.UUID) {
      branchUUID = entry.UUID;
    } else if (this.#store.schema[branch].trunk === undefined
               || branchType === 'array'
               || branchType === 'object') {
      branchUUID = await digestMessage(await this.#callback.randomUUID());
    } else {
      branchUUID = await digestMessage(branchValue);
    }

    // add to props if needed
    const indexPath = `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`;

    const indexFile = this.#store.output[indexPath] ?? this.#store.cache[indexPath];

    const branchValueEscaped = this.#store.schema[branch].type === 'string'
      ? JSON.stringify(branchValue)
      : branchValue;

    const isUUID = branchType === 'hash' || branchType === 'object' || branchType === 'array';

    const indexLine = isUUID ? `${branchUUID}\n` : `${branchUUID},${branchValueEscaped}\n`;

    if (indexFile === '\n') {
      this.#store.output[indexPath] = indexLine;
    } else if (!indexFile.includes(indexLine)) {
      const indexPruned = await this.#callback.grep(indexFile, branchUUID, true);

      this.#store.output[indexPath] = indexPruned + indexLine;
    }

    await this.#linkLeaves(entry, branchUUID);

    return { UUID: branchUUID, ...entry };
  }

  /**
   * This removes an entry from the database.
   * @name remove
   * @param {object} entry - A database entry.
   * @function
   */
  async #remove(entry) {
    const branch = entry['|'];

    const branchType = this.#store.schema[branch].type;

    if (branchType === 'hash'
        || branchType === 'object'
        || branchType === 'array') {
      if (entry.UUID === undefined) {
        throw Error(`failed to remove ${branchType} branch ${branch} entry without UUID`);
      }
      return undefined;
    }

    const branchValue = entry[branch];

    let branchUUID;

    if (entry.UUID) {
      branchUUID = entry.UUID;
    } else if (this.#store.schema[branch].trunk === undefined) {
      throw Error(`failed to remove root branch ${branch} entry without UUID`);
    } else {
      branchUUID = await digestMessage(branchValue);
    }

    // prune props if exist
    const indexPath = `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`;

    const indexFile = this.#store.output[indexPath] ?? this.#store.cache[indexPath];

    const indexPruned = await this.#callback.grep(indexFile, branchUUID, true);

    this.#store.output[indexPath] = indexPruned;

    return branchUUID;
  }

  /**
   * This links all leaves to the branch.
   * @name linkLeaves
   * @param {object} entry - A database entry.
   * @param {object} branchUUID - The branch UUID.
   * @function
   */
  async #linkLeaves(entry, branchUUID) {
    const branch = entry['|'];

    const branchType = this.#store.schema[branch].type;

    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch
              && this.#store.schema[b].type !== 'regex');

    // map leaves
    await Promise.all(leaves.map(async (leaf) => {
    // for (const leaf of leaves) {
      const entryLeaves = branchType === 'array'
        ? entry.items.map((item) => item['|'])
        : Object.keys(entry);

      if (entryLeaves.includes(leaf)) {
        // link if in the entry
        if (this.#store.schema[branch].type === 'array') {
          const leafItems = entry.items.filter((item) => item['|'] === leaf);

          // unlink all items from branch for refresh
          await this.#unlinkLeaves(branch, branchUUID);

          await Promise.all(leafItems.map(async (item) => {
          // for (const item of leafItems) {
            await this.#linkTrunk(branchUUID, item);
          }));
        } else {
          const leafEntry = this.#store.schema[leaf].type === 'array' || this.#store.schema[leaf].type === 'object'
            ? entry[leaf]
            : Object.keys(entry)
              .filter((b) => this.#store.schema[b]?.trunk === leaf)
              .reduce(
                (acc, key) => ({ [key]: entry[key], ...acc }),
                { '|': leaf, [leaf]: entry[leaf] },
              );

          await this.#linkTrunk(branchUUID, leafEntry);
        }
      } else {
        /// unlink if not in the entry
        await this.#unlinkTrunk(branchUUID, leaf);
      }
    }));
  }

  /**
   * This links an entry to a trunk UUID.
   * @name linkTrunk
   * @param {object} trunkUUID - The trunk UUID.
   * @param {object} entry - A database entry.
   * @function
   */
  async #linkTrunk(trunkUUID, entry) {
    const branch = entry['|'];

    const { trunk } = this.#store.schema[branch];
    // save if needed
    const { UUID: branchUUID } = await this.#save(entry);

    // add to pairs
    const pairLine = `${trunkUUID},${branchUUID}\n`;

    const pairPath = `metadir/pairs/${trunk}-${branch}.csv`;

    const pairFile = this.#store.output[pairPath] ?? this.#store.cache[pairPath];

    if (pairFile === '\n') {
      this.#store.output[pairPath] = pairLine;
    } else if (!pairFile.includes(pairLine)) {
      if (this.#store.schema[trunk].type === 'array') {
        this.#store.output[pairPath] = pairFile + pairLine;
      } else {
        const pairPruned = await this.#callback.grep(pairFile, trunkUUID, true);

        this.#store.output[pairPath] = pairPruned + pairLine;
      }
    }
  }

  /**
   * This unlinks an entry from a trunk UUID.
   * @name unlinkTrunk
   * @param {object} trunkUUID - The trunk UUID.
   * @param {object} entry - A database entry.
   * @function
   */
  async #unlinkTrunk(trunkUUID, branch) {
    // prune pairs file for trunk UUID
    const pairPath = `metadir/pairs/${this.#store.schema[branch].trunk}-${branch}.csv`;

    // if file, prune it for trunk UUID
    const pairFile = this.#store.cache[pairPath];

    if (pairFile !== '\n') {
      const pairPruned = await this.#callback.grep(pairFile, trunkUUID, true);

      this.#store.output[pairPath] = pairPruned;
    }
  }

  /**
   * This unlinks a branch UUID from all trunk UUIDs.
   * @name unlinkTrunks
   * @param {string} branch - A branch name.
   * @param {string} branchUUID - A branch UUID.
   * @function
   */
  async #unlinkTrunks(branch, branchUUID) {
    const { trunk } = this.#store.schema[branch];

    // unlink trunk if it exists
    if (trunk !== undefined) {
      // find trunkUUIDs
      const trunkLines = await this.#callback.grep(
        `metadir/pairs/${trunk}-${branch}.csv`,
        `,${branchUUID}$`,
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
   * @param {string} branchUUID - A branch UUID.
   * @function
   */
  async #unlinkLeaves(branch, branchUUID) {
    // find all leaves
    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch
              && this.#store.schema[b].type !== 'regex');

    await Promise.all(leaves.map(async (leaf) => {
      await this.#unlinkTrunk(branchUUID, leaf);
    }));
  }
}
