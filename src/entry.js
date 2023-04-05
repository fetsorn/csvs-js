/* eslint-disable import/extensions */
import { takeUUIDs } from './metadir.js';
import { grep, prune } from './grep.js';
import Store from './store.js';

/**
 * This generates a SHA-256 hashsum.
 * @name digestMessage
 * @function
 * @param {string} message - A string.
 * @returns {string} - SHA-256 hashsum.
 */
export async function digestMessage(message) {
  // hash as buffer
  // const hashBuffer = await digest(message);

  let hashBuffer;

  if (typeof window === 'undefined') {
    const crypto = await import('crypto');

    // hashBuffer = crypto.createHash('sha256').update(message, 'utf8').digest();
    hashBuffer = await crypto.webcrypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(message),
    );
  } else {
    hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(message),
    );
  }

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

    const branchUUID = await this.#remove(entry);

    await this.#unlinkTrunks(entry._, entry.UUID ?? branchUUID);

    await this.#unlinkLeaves(entry._, entry.UUID ?? branchUUID);

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
    } else if (branchType === 'hash') {
      branchUUID = branchValue;
    } else {
      branchUUID = await digestMessage(branchValue);
    }

    // add to props if needed
    const indexPath = `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`;

    const branchValueEscaped = this.#store.schema[branch].type === 'string'
      ? JSON.stringify(branchValue)
      : branchValue;

    const isUUID = branchType === 'hash' || branchType === 'object' || branchType === 'array';

    const indexLine = isUUID ? `${branchUUID}\n` : `${branchUUID},${branchValueEscaped}\n`;

    const indexFile = this.#store.getOutput(indexPath) ?? this.#store.getCache(indexPath);

    if (indexFile === '\n') {
      this.#store.setOutput(indexPath, indexLine);
    } else if (!indexFile.includes(indexLine)) {
      const indexPruned = prune(indexFile, branchUUID);

      if (indexPruned === '\n') {
        this.#store.setOutput(indexPath, indexLine);
      } else {
        this.#store.setOutput(indexPath, `${indexPruned}\n${indexLine}`);
      }
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
    const branch = entry._;

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

    const indexFile = this.#store.getOutput(indexPath) ?? this.#store.getCache(indexPath);

    const indexPruned = prune(indexFile, branchUUID);

    this.#store.setOutput(indexPath, indexPruned);

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
    const branch = entry._;

    const branchType = this.#store.schema[branch].type;

    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch
              && this.#store.schema[b].type !== 'regex');

    if (this.#store.schema[branch].type === 'array') {
      // unlink all items from branch for refresh
      await this.#unlinkLeaves(branch, branchUUID);
    }

    // map leaves
    await Promise.all(leaves.map(async (leaf) => {
    // for (const leaf of leaves) {
      const entryLeaves = branchType === 'array'
        ? entry.items.map((item) => item._)
        : Object.keys(entry);

      if (entryLeaves.includes(leaf)) {
        // link if in the entry
        if (this.#store.schema[branch].type === 'array') {
          const leafItems = entry.items.filter((item) => item._ === leaf);

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
                { _: leaf, [leaf]: entry[leaf] },
              );

          await this.#linkTrunk(branchUUID, leafEntry);
        }
      } else {
        /// unlink if not in the entry
        await this.#unlinkTrunk(branchUUID, leaf);
      }
    }));
    // }
  }

  /**
   * This links an entry to a trunk UUID.
   * @name linkTrunk
   * @param {object} trunkUUID - The trunk UUID.
   * @param {object} entry - A database entry.
   * @function
   */
  async #linkTrunk(trunkUUID, entry) {
    const branch = entry._;

    const { trunk } = this.#store.schema[branch];
    // save if needed
    const { UUID: branchUUID } = await this.#save(entry);

    // add to pairs
    const pairLine = `${trunkUUID},${branchUUID}\n`;

    const pairPath = `metadir/pairs/${trunk}-${branch}.csv`;

    const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

    if (pairFile === '\n') {
      this.#store.setOutput(pairPath, pairLine);
    } else if (!pairFile.includes(pairLine)) {
      if (this.#store.schema[trunk].type === 'array') {
        this.#store.setOutput(pairPath, pairFile + pairLine);
      } else {
        const pairPruned = prune(pairFile, trunkUUID);

        if (pairPruned === '\n') {
          this.#store.setOutput(pairPath, pairLine);
        } else {
          this.#store.setOutput(pairPath, `${pairPruned}\n${pairLine}`);
        }
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
    const pairFile = this.#store.getCache(pairPath);

    if (pairFile === '\n' || pairFile === '') {
      return;
    }

    const pairPruned = prune(pairFile, trunkUUID);

    this.#store.setOutput(pairPath, `${pairPruned}\n`);
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
      const trunkLines = grep(
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
