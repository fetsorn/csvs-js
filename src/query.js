/* eslint-disable import/extensions */
import { findSchemaRoot, findCrown } from './schema.js';
import {
  takeValue, takeUUIDs, takeValues,
} from './metadir.js';
import Store from './store.js';
import { grep, lookup } from './grep.js';

/**
 * This finds all UUIDs of the branch.
 * @name findAllUUIDs
 * @function
 * @param {object} store - Map of file paths to file contents.
 * @param {object} schema - Database schema.
 * @param {string} branch - Branch name.
 * @returns {string[]} - Array of leaf branches connected to the base branch.
 */
export function findAllUUIDs(store, schema, branch) {
  const { trunk } = schema[branch];

  return trunk === undefined
    ? takeUUIDs(store[`metadir/props/${schema[branch].dir ?? branch}/index.csv`])
    : takeValues(store[`metadir/pairs/${trunk}-${branch}.csv`]);
}

/** Class representing a database query. */
export default class Query {
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
   * .
   * @type {Object}
   */
  #crowns = {};

  /**
   * Create a database instance.
   * @param {Object} callback - Object with callbacks.
   * @param {readFileCallback} callback.readFile - The callback that reads db.
   * @param {grepCallback} callback.grep - The callback that searches files.
   */
  constructor(callback) {
    this.#callback = callback;

    this.#store = new Store(callback);
  }

  /**
   * This returns an array of entries from the database.
   * @name select
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {Object[]}
   */
  async select(urlSearchParams) {
    await this.#store.readSchema();

    const searchParams = urlSearchParams ?? new URLSearchParams();

    // if no base is provided, find first schema root
    const base = searchParams.has('|') ? searchParams.get('|') : findSchemaRoot(this.#store.schema);

    // get a map of database file contents
    await this.#store.read(base);

    // get an array of base UUIDs
    const baseUUIDs = await this.#searchUUIDs(base, searchParams);

    // get an array of entries
    const entries = await this.#buildEntries(base, baseUUIDs);

    return entries;
  }

  /**
   * This returns an array of base UUIDs.
   * @name searchUUIDs
   * @function
   * @param {string} base - Base branch.
   * @param {URLSearchParams} searchParams - The search parameters.
   * @returns {string[]} - Array of base UUIDs.
   */
  async #searchUUIDs(base, searchParams) {
    // get array of all UUIDs of the base branch
    const baseUUIDSets = [findAllUUIDs(this.#store.cache, this.#store.schema, base)];

    const searchEntries = Array.from(searchParams.entries()).filter(
      ([key]) => key !== 'groupBy' && key !== 'overviewType' && key !== '|',
    );

    // grep against every search result until reaching a common set of UUIDs
    await Promise.all(searchEntries.map(async ([branch, value]) => {
      switch (this.#store.schema[branch].type) {
        case 'regex': {
          const { trunk } = this.#store.schema[branch];

          const rulePath = `metadir/props/${this.#store.schema[branch].dir ?? branch}/rules/${value}.rule`;

          const ruleFile = await this.#callback.readFile(rulePath) ?? '\n';

          const trunkLines = await this.#callback.grep(
            this.#store.cache[`metadir/props/${this.#store.schema[trunk].dir ?? trunk}/index.csv`],
            ruleFile,
          );

          const trunkUUIDs = takeUUIDs(trunkLines);

          if (trunk === base) {
            baseUUIDSets.push(trunkUUIDs);
          } else {
            baseUUIDSets.push(await this.#findBaseUUIDs(base, trunk, trunkUUIDs));
          }

          break;
        }

        default: {
          const branchValue = this.#store.schema[branch].type === 'string'
            ? JSON.stringify(value)
            : value;

          const branchLines = await this.#callback.grep(
            this.#store.cache[`metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`],
            `(^${value},)|(,${branchValue}$)`,
          );

          const branchUUIDs = takeUUIDs(branchLines);

          if (branch === base) {
            baseUUIDSets.push(branchUUIDs);
          } else {
            const baseUUIDs = await this.#findBaseUUIDs(base, branch, branchUUIDs);

            baseUUIDSets.push(baseUUIDs);
          }
        }
      }
    }));

    const baseUUIDs = baseUUIDSets.reduce((a, b) => a.filter((c) => b.includes(c)));

    return baseUUIDs;
  }

  /**
   * This returns an array of base UUIDs related to branch UUIDs.
   * @name findBaseUUIDs
   * @function
   * @param {string} base - Base branch.
   * @param {string} branch - Branch name.
   * @param {string[]} branchUUIDs - Array of branch UUIDs.
   * @returns {string[]} - Array of base UUIDs.
   */
  async #findBaseUUIDs(base, branch, branchUUIDs) {
    if (branchUUIDs.length === 0) { return []; }

    const { trunk } = this.#store.schema[branch];

    const pairLines = grep(
      this.#store.cache[`metadir/pairs/${trunk}-${branch}.csv`],
      branchUUIDs.join('\n'),
    );

    const trunkUUIDs = takeUUIDs(pairLines);

    if (trunk === base) {
      return trunkUUIDs;
    }

    return this.#findBaseUUIDs(base, trunk, trunkUUIDs);
  }

  /**
   * This returns an array of entries.
   * @name buildEntries
   * @function
   * @param {string} base - Base branch.
   * @param {string[]} baseUUIDs - Array of base UUIDs.
   * @returns {object[]} - Array of entries.
   */
  async #buildEntries(base, baseUUIDs) {
    const entries = [];

    await Promise.all(baseUUIDs.map(async (baseUUID) => {
    // for (let i = 0; i < baseUUIDs.length; i += 1) {
      // const baseUUID = baseUUIDs[i];

      // eslint-disable-next-line
      entries.push(await this.#buildEntry(base, baseUUID));
    }));
    // }

    return entries;
  }

  /**
   * This returns an entry.
   * @name buildEntry
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @returns {object} - Entry.
   */
  async #buildEntry(base, baseUUID) {
    const entry = { '|': base, UUID: baseUUID };

    switch (this.#store.schema[base].type) {
      case 'object':
        break;

      case 'array':
        entry.items = [];
        break;

      default:
        entry[base] = await this.#findBranchValue(base, baseUUID);
    }

    if (this.#crowns[base] === undefined) {
      this.#crowns[base] = findCrown(this.#store.schema, base)
        .filter((branch) => this.#store.schema[branch].type !== 'regex');
    }

    const crown = this.#crowns[base];
    // find all branches connected to base

    await Promise.all(crown.map(async (branch) => {
      // for (const branch of leaves) {
      // get value of branch
      const branchValue = await this.#buildBranchValue(base, baseUUID, branch);

      if (branchValue !== undefined) {
        if (this.#store.schema[base].type === 'array') {
          entry.items.push(branchValue);

          entry.items = entry.items.flat();
        } else {
          // assign value to entry
          entry[branch] = branchValue;
        }
      }
    }));

    return entry;
  }

  /**
   * This returns a value of the branch above base.
   * @name buildBranchValue
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @param {string} branch - Branch name.
   * @returns {object|object[]} - Value or array of values.
   */
  async #buildBranchValue(base, baseUUID, branch) {
    // get the branch UUID related to the base UUID
    const branchUUID = await this.#findBranchUUID(base, baseUUID, branch);

    if (branchUUID === undefined) {
      return undefined;
    }

    if (Array.isArray(branchUUID)) {
      const branchValues = [];

      await Promise.all(branchUUID.map(async (uuid) => {
        // get value of branch
        const branchValue = await this.#findBranchValue(branch, uuid);

        branchValues.push(branchValue);
      }));

      return branchValues;
    }

    // get value of branch
    const branchValue = await this.#findBranchValue(branch, branchUUID);

    return branchValue;
  }

  /**
   * This returns the branch UUID related to the base UUID.
   * @name findBranchUUID
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseUUID - Base UUID.
   * @param {string} branch - Branch name.
   * @returns {string|string[]} - Branch UUID(s).
   */
  async #findBranchUUID(base, baseUUID, branch) {
    const { trunk } = this.#store.schema[branch];

    const trunkUUID = trunk === base
      ? baseUUID
      : await this.#findBranchUUID(base, baseUUID, trunk);

    const pairLines = await lookup(
      this.#store.cache[`metadir/pairs/${trunk}-${branch}.csv`],
      trunkUUID,
      true,
    );

    if (pairLines === '') {
      return undefined;
    }

    if (this.#store.schema[base].type === 'array') {
      const branchUUIDs = takeValues(pairLines);

      return branchUUIDs;
    }

    const branchUUID = takeValue(pairLines);

    return branchUUID;
  }

  /**
   * This returns the value related to branchUUID.
   * @name findBranchValue
   * @function
   * @param {string} branch - Branch name.
   * @param {string} branchUUID - Branch UUID.
   * @returns {object} - Branch value.
   */
  async #findBranchValue(branch, branchUUID) {
    switch (this.#store.schema[branch].type) {
      case 'array':
        return this.#buildEntry(branch, branchUUID);

      case 'object':
        return this.#buildEntry(branch, branchUUID);

      case 'hash':
        return branchUUID;

      case 'string': {
        const branchLine = lookup(
          this.#store.cache[`metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`],
          branchUUID,
        );

        if (branchLine !== '') {
          const branchValue = JSON.parse(takeValue(branchLine));

          return branchValue;
        }

        return undefined;
      }

      default: {
        const branchLine = lookup(
          this.#store.cache[`metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`],
          branchUUID,
        );

        if (branchLine !== '') {
          const branchValue = takeValue(branchLine);

          return branchValue;
        }

        return undefined;
      }
    }
  }
}
