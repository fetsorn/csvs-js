/* eslint-disable import/extensions */
import { findSchemaRoot, findCrown } from './schema.js';
import {
  takeValue, takeKeys, takeValues,
} from './metadir.js';
import Store from './store.js';
import { grep, lookup } from './grep.js';
import stream from 'stream';

/**
 * This finds all keys of the branch.
 * @name findAllKeys
 * @function
 * @param {object} store - Map of file paths to file contents.
 * @param {object} schema - Dataset schema.
 * @param {string} branch - Branch name.
 * @returns {string[]} - Array of leaf branches connected to the base branch.
 */
export function findAllKeys(store, schema, branch) {
  const { trunk } = schema[branch];

  const trunkKeys = trunk !== undefined
        ? takeValues(store[`${trunk}-${branch}.csv`])
        : [];

  const leaves = Object.keys(schema)
                       .filter((leaf) => schema[leaf].trunk === branch);

  const leafKeys = leaves.map((leaf) => {
    return takeKeys(store[`${branch}-${leaf}.csv`])
  })

  return [...new Set([...trunkKeys, ...leafKeys].flat())]
}

/** Class representing a dataset query. */
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
   * Create a dataset instance.
   * @param {Object} callback - Object with callbacks.
   * @param {readFileCallback} callback.readFile - The callback that reads db.
   * @param {grepCallback} callback.grep - The callback that searches files.
   */
  constructor(callback) {
    this.#callback = callback;

    this.#store = new Store(callback);
  }

  /**
   * This returns an array of records from the dataset.
   * @name select
   * @function
   * @param {URLSearchParams} urlSearchParams - The search parameters.
   * @returns {Object[]}
   */
  async select(urlSearchParams) {
    await this.#store.readSchema();

    const searchParams = urlSearchParams ?? new URLSearchParams();

    // if no base is provided, find first schema root
    const base = searchParams.has('_') ? searchParams.get('_') : findSchemaRoot(this.#store.schema);

    // get a map of dataset file contents
    await this.#store.read(base);

    // get an array of base keys
    const baseKeys = await this.#searchKeys(base, searchParams);

    // get an array of records
    const records = await this.#buildRecords(base, baseKeys);

    return records;
  }

  async selectBaseKeys(urlSearchParams) {
    await this.#store.readSchema();

    const searchParams = urlSearchParams ?? new URLSearchParams();

    // if no base is provided, find first schema root
    const base = searchParams.has('_') ? searchParams.get('_') : findSchemaRoot(this.#store.schema);

    // get a map of dataset file contents
    await this.#store.read(base);

    // get an array of base keys
    const baseKeys = await this.#searchKeys(base, searchParams);

    return {base, baseKeys}
  }

  async buildRecords(base, baseKey) {
    await this.#store.readSchema();

    await this.#store.read(base);

    return this.#buildRecords(base, baseKey);
  }

  async selectStream(urlSearchParams) {
    await this.#store.readSchema();

    const searchParams = urlSearchParams ?? new URLSearchParams();

    // if no base is provided, find first schema root
    const base = searchParams.has('_') ? searchParams.get('_') : findSchemaRoot(this.#store.schema);

    // get a map of database file contents
    await this.#store.read(base);

    // get an array of base keys
    const baseKeys = await this.#searchKeys(base, searchParams);

    const query = this;

    return new stream.Readable({
      objectMode: true,

      async read(controller) {
        if (this._buffer === undefined) {
          this._buffer = baseKeys;
        }

        const baseKey = this._buffer.pop();

        const record = await query.#buildRecord(base, baseKey);

        this.push(record);

        if (this._buffer.length === 0) {
          this.push(null)
        }
      },
    })
  }

  /**
   * This returns an array of base keys.
   * @name searchKeys
   * @function
   * @param {string} base - Base branch.
   * @param {URLSearchParams} searchParams - The search parameters.
   * @returns {string[]} - Array of base keys.
   */
  async #searchKeys(base, searchParams) {
    const searchEntries = Array.from(searchParams.entries()).filter(
      ([key]) => key !== '.' && key !== '~' && key !== '-' && key !== '_',
    );

    // if no queries, return all values
    if (searchEntries.length === 0) {
      const baseValues = findAllKeys(this.#store.cache, this.#store.schema, base);

      return baseValues
    }

    const baseValueSets = await Promise.all(searchEntries.map(async ([branch, value]) => {
      if (branch === base) {
        // search all leaf relations
        const leaves = Object.keys(this.#store.schema)
                             .filter((leaf) => this.#store.schema[leaf].trunk === base);

        const leafValues = await Promise.all(leaves.map(async (leaf) => {
          const baseLines = await this.#callback.grep(
            this.#store.cache[`${base}-${leaf}.csv`],
            `^${value},`
          )

          const baseValues = takeKeys(baseLines)

          return baseValues
        }))

        return [...new Set(leafValues.flat())];
      } else {
        const { trunk } = this.#store.schema[branch];

        // search the trunk relation
        const branchLines = await this.#callback.grep(
          this.#store.cache[`${trunk}-${branch}.csv`],
          `,${value}$`
        )

        const branchValues = takeValues(branchLines);

        const baseValues = await this.#findBaseKeys(base, branch, branchValues)

        return baseValues;
      }

    }));

    const baseValues = baseValueSets.reduce((a, b) => a.filter((c) => b.includes(c)));

    return baseValues.flat();
  }

  /**
   * This returns an array of base keys related to branch keys.
   * @name findBaseKeys
   * @function
   * @param {string} base - Base branch.
   * @param {string} branch - Branch name.
   * @param {string[]} branchKeys - Array of branch keys.
   * @returns {string[]} - Array of base keys.
   */
  async #findBaseKeys(base, branch, branchKeys) {
    if (branchKeys.length === 0) { return []; }

    const { trunk } = this.#store.schema[branch];

    const pairLines = grep(
      this.#store.cache[`${trunk}-${branch}.csv`],
      branchKeys.join('\n'),
    );

    const trunkKeys = takeKeys(pairLines);

    if (trunk === base) {
      return trunkKeys;
    }

    return this.#findBaseKeys(base, trunk, trunkKeys);
  }

  /**
   * This returns an array of records.
   * @name buildRecords
   * @function
   * @param {string} base - Base branch.
   * @param {string[]} baseKeys - Array of base keys.
   * @returns {object[]} - Array of records.
   */
  async #buildRecords(base, baseKeys) {

    const records = await Promise.all(
      baseKeys.map(async (baseKey) => this.#buildRecord(base, baseKey))
    );

    return records;
  }

  /**
   * This returns a record.
   * @name buildRecord
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseValue - Base value.
   * @returns {object} - Record.
   */
  async #buildRecord(base, baseValue) {
    let record = { _: base };

    record['|'] = baseValue;

    const leaves = Object.keys(this.#store.schema)
                         .filter((leaf) => this.#store.schema[leaf].trunk === base);

    await Promise.all(leaves.map(async (leaf) => {
      // get all values of leaves
      const leafValues = await this.#findBranchValues(base, baseValue, leaf);

      const leafRecords = await Promise.all(leafValues.map(
        (leafValue) => this.#buildRecord(leaf, leafValue)
      ))

      if (leafRecords !== undefined && leafRecords.length > 0) {
        if (leafRecords.length === 1) {
          const leafRecord = leafRecords[0];

          if (Object.keys(leafRecord).length === 2) {
            record[leaf] = leafRecord["|"];
          } else {
            record[leaf] = leafRecord;
          }
        } else {
          record[leaf] = leafRecords;
        }
      }
    }));

    return record;
  }

  /**
   * This returns the branch values related to the base value.
   * @name findBranchValues
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseValue - Base value.
   * @param {string} branch - Branch name.
   * @returns {string[]} - Branch value(s).
   */
  async #findBranchValues(base, baseValue, branch) {
    const { trunk } = this.#store.schema[branch];

    const trunkValues = trunk === base
      ? [ baseValue ]
      : await this.#findBranchValues(base, baseValue, trunk);

    const branchValues = await Promise.all(trunkValues.map(async (trunkValue) => {
      const pairLines = await lookup(
        this.#store.cache[`${trunk}-${branch}.csv`],
        trunkValue,
        true,
      );

      if (pairLines === '') {
        return [];
      }

      return takeValues(pairLines);
    }))

    return branchValues.flat();
  }
}
