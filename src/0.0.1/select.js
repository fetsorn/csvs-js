import stream from "stream";
import { findSchemaRoot, findCrown } from "./schema.js";
import { takeValue, takeKeys, takeValues } from "./metadir.js";
import Store from "./store.js";
import { grep, lookup } from "./grep.js";

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

  return trunk === undefined
    ? takeKeys(store[`metadir/props/${schema[branch].dir ?? branch}/index.csv`])
    : takeValues(store[`metadir/pairs/${trunk}-${branch}.csv`]);
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
    const base = searchParams.has("_")
      ? searchParams.get("_")
      : findSchemaRoot(this.#store.schema);

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
    const base = searchParams.has("_")
      ? searchParams.get("_")
      : findSchemaRoot(this.#store.schema);

    // get a map of dataset file contents
    await this.#store.read(base);

    // get an array of base keys
    const baseKeys = await this.#searchKeys(base, searchParams);

    return { base, baseKeys };
  }

  async buildRecord(base, baseKey) {
    await this.#store.readSchema();

    await this.#store.read(base);

    return this.#buildRecord(base, baseKey);
  }

  async selectStream(urlSearchParams) {
    await this.#store.readSchema();

    const searchParams = urlSearchParams ?? new URLSearchParams();

    // if no base is provided, find first schema root
    const base = searchParams.has("_")
      ? searchParams.get("_")
      : findSchemaRoot(this.#store.schema);

    // get a map of database file contents
    await this.#store.read(base);

    // get an array of base keyss
    const baseKeys = await this.#searchKeys(base, searchParams);

    const query = this;

    return new stream.Readable({
      objectMode: true,

      async read() {
        if (this._buffer === undefined) {
          this._buffer = baseKeys;
        }

        const baseKey = this._buffer.pop();

        const record = await query.#buildRecord(base, baseKey);

        this.push(record);

        if (this._buffer.length === 0) {
          this.push(null);
        }
      },
    });
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
    // get array of all keys of the base branch
    const baseKeySets = [
      findAllKeys(this.#store.cache, this.#store.schema, base),
    ];

    const searchEntries = Array.from(searchParams.entries()).filter(
      ([key]) => key !== "." && key !== "~" && key !== "-" && key !== "_",
    );

    // grep against every search result until reaching a common set of keys
    await Promise.all(
      searchEntries.map(async ([branch, value]) => {
        switch (this.#store.schema[branch].type) {
          case "regex": {
            const { trunk } = this.#store.schema[branch];

            const rulePath = `metadir/props/${this.#store.schema[branch].dir ?? branch}/rules/${value}.rule`;

            const ruleFile = (await this.#callback.readFile(rulePath)) ?? "\n";

            const trunkLines = await this.#callback.grep(
              this.#store.cache[
                `metadir/props/${this.#store.schema[trunk].dir ?? trunk}/index.csv`
              ],
              ruleFile,
            );

            const trunkKeys = takeKeys(trunkLines);

            if (trunk === base) {
              baseKeySets.push(trunkKeys);
            } else {
              baseKeySets.push(
                await this.#findBaseKeys(base, trunk, trunkKeys),
              );
            }

            break;
          }

          default: {
            const branchValue =
              this.#store.schema[branch].type === "string"
                ? JSON.stringify(value)
                : value;

            const branchLines = await this.#callback.grep(
              this.#store.cache[
                `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`
              ],
              `(^${value},)|(,${branchValue}$)`,
            );

            const branchKeys = takeKeys(branchLines);

            if (branch === base) {
              baseKeySets.push(branchKeys);
            } else {
              const baseKeys = await this.#findBaseKeys(
                base,
                branch,
                branchKeys,
              );

              baseKeySets.push(baseKeys);
            }
          }
        }
      }),
    );

    const baseKeys = baseKeySets.reduce((a, b) =>
      a.filter((c) => b.includes(c)),
    );

    return baseKeys;
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
    if (branchKeys.length === 0) {
      return [];
    }

    const { trunk } = this.#store.schema[branch];

    const pairLines = grep(
      this.#store.cache[`metadir/pairs/${trunk}-${branch}.csv`],
      branchKeys.join("\n"),
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
    const records = [];

    await Promise.all(
      baseKeys.map(async (baseKey) => {
        // for (let i = 0; i < baseKeys.length; i += 1) {
        // const baseKey = baseKeys[i];

        records.push(await this.#buildRecord(base, baseKey));
      }),
    );
    // }

    return records;
  }

  /**
   * This returns an record.
   * @name buildRecord
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseKey - Base key.
   * @returns {object} - Record.
   */
  async #buildRecord(base, baseKey) {
    const record = { _: base, UUID: baseKey };

    switch (this.#store.schema[base].type) {
      case "object":
        break;

      case "array":
        record.items = [];
        break;

      default:
        record[base] = await this.#findBranchValue(base, baseKey);
    }

    if (this.#crowns[base] === undefined) {
      this.#crowns[base] = findCrown(this.#store.schema, base).filter(
        (branch) => this.#store.schema[branch].type !== "regex",
      );
    }

    const crown = this.#crowns[base];
    // find all branches connected to base

    await Promise.all(
      crown.map(async (branch) => {
        // for (const branch of leaves) {
        // get value of branch
        const branchValue = await this.#buildBranchValue(base, baseKey, branch);

        if (branchValue !== undefined) {
          if (this.#store.schema[base].type === "array") {
            record.items.push(branchValue);

            record.items = record.items.flat();
          } else {
            // assign value to record
            record[branch] = branchValue;
          }
        }
      }),
    );

    return record;
  }

  /**
   * This returns a value of the branch above base.
   * @name buildBranchValue
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseKey - Base key.
   * @param {string} branch - Branch name.
   * @returns {object|object[]} - Value or array of values.
   */
  async #buildBranchValue(base, baseKey, branch) {
    // get the branch key related to the base key
    const branchKey = await this.#findBranchKey(base, baseKey, branch);

    if (branchKey === undefined) {
      return undefined;
    }

    if (Array.isArray(branchKey)) {
      const branchValues = [];

      await Promise.all(
        branchKey.map(async (key) => {
          // get value of branch
          const branchValue = await this.#findBranchValue(branch, key);

          branchValues.push(branchValue);
        }),
      );

      return branchValues;
    }

    // get value of branch
    const branchValue = await this.#findBranchValue(branch, branchKey);

    return branchValue;
  }

  /**
   * This returns the branch key related to the base key.
   * @name findBranchKey
   * @function
   * @param {string} base - Base branch.
   * @param {string} baseKey - Base key.
   * @param {string} branch - Branch name.
   * @returns {string|string[]} - Branch key(s).
   */
  async #findBranchKey(base, baseKey, branch) {
    const { trunk } = this.#store.schema[branch];

    const trunkKey =
      trunk === base
        ? baseKey
        : await this.#findBranchKey(base, baseKey, trunk);

    const pairLines = await lookup(
      this.#store.cache[`metadir/pairs/${trunk}-${branch}.csv`],
      trunkKey,
      true,
    );

    if (pairLines === "") {
      return undefined;
    }

    if (this.#store.schema[base].type === "array") {
      const branchKeys = takeValues(pairLines);

      return branchKeys;
    }

    const branchKey = takeValue(pairLines);

    return branchKey;
  }

  /**
   * This returns the value related to branchKey.
   * @name findBranchValue
   * @function
   * @param {string} branch - Branch name.
   * @param {string} branchKey - Branch key.
   * @returns {object} - Branch value.
   */
  async #findBranchValue(branch, branchKey) {
    switch (this.#store.schema[branch].type) {
      case "array":
        return this.#buildRecord(branch, branchKey);

      case "object":
        return this.#buildRecord(branch, branchKey);

      case "hash":
        return branchKey;

      case "string": {
        const branchLine = lookup(
          this.#store.cache[
            `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`
          ],
          branchKey,
        );

        if (branchLine !== "") {
          const branchValue = JSON.parse(takeValue(branchLine));

          return branchValue;
        }

        return undefined;
      }

      default: {
        const branchLine = lookup(
          this.#store.cache[
            `metadir/props/${this.#store.schema[branch].dir ?? branch}/index.csv`
          ],
          branchKey,
        );

        if (branchLine !== "") {
          const branchValue = takeValue(branchLine);

          return branchValue;
        }

        return undefined;
      }
    }
  }
}
