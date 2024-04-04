/* eslint-disable import/extensions */
import { grep, pruneValue, pruneKey } from './grep.js';
import { findCrown } from './schema.js';
import Store from './store.js';
import csv from 'papaparse';

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

    // exit if record is undefined
    if (record === undefined) return

    // TODO find base value if _ is object or array
    // TODO exit if no base field or invalid base value
    const base = record._;

    await this.#store.read(base);

    if (base === "_") {
      this.#saveSchema(record)
    } else {
      this.#save(record);
    }

    // TODO if query result equals record skip
    // otherwise write output
    await this.#store.write();
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
    await this.#unlinkTrunks(base, record[base]);

    // prune `^value,` in all `branch-{leaf}.csv` files
    await this.#unlinkLeaves(base, record[base]);

    await this.#store.write();
  }

  /**
   * This saves a record to the dataset.
   * @name saveSchema
   * @param {object} record - A dataset record.
   * @function
   */
  #saveSchema(record) {
    // for each field, for each value
    const trunks = Object.keys(record).filter((key) => key !== "_")

    // list of
    const relations = trunks.reduce(
      (acc, trunk) => {
        const values = record[trunk]

        // TODO: handle if value is literal, expand?
        // TODO: handle if value is object, expand?
        // TODO: handle if value is array of objects?
        // assume value is array of literals
        const relations = values.map((branch) => `${trunk},${branch}`)

        return acc.concat(relations)
      }, []);

    const contents = relations.sort().join('\n');

    // overwrite the .csvs.csv file with field,value
    this.#store.setOutput("_-_.csv", contents);
  }

  /**
   * This collapses a nested record into a list of key-value relations
   * @name recordToRelations
   * @param {object} record - A dataset record.
   * @function
   * @returns {string[3][]} - A list of tuples (relation, key, value)
   */
  #recordToRelations(record) {
    // { _: trunk, trunk: key, leaf: value, leaf: [ value ], leaf: { _: leaf, leaf: value } }

    const base = record._;

    // skip if record doesn't have the base
    if (record._ === undefined) return [];

    const key = record[base] ?? "";

    const leaves = Object.keys(this.#store.schema)
                         .filter((branch) => this.#store.schema[branch].trunk === base);

    // build a relation map of the record.
    // [tablet, key, value]
    return leaves.reduce((leafQueue, leaf) => {
      // skip if record doesn't have the leaf
      if (record[leaf] === undefined) return leafQueue;

      const values = Array.isArray(record[leaf])
            ? record[leaf]
            : [record[leaf]];

      const pair = `${base}-${leaf}.csv`;

      const relations = values.reduce((relationQueue, value) => {
        if (typeof value === "string") {
          return [[pair, key, value], ...relationQueue]
        }

        const valueNested = value[leaf] ?? "";

        return [
          [pair, key, valueNested],
          ...this.#recordToRelations(value),
          ...relationQueue
        ]
      }, []);

      return [...relations, ...leafQueue]
    }, [])
  }

  /**
   * This collapses a nested record into a map of key-value relations
   * @name recordToRelations
   * @param {object} record - A dataset record.
   * @function
   * @returns {object} - A map of key-value relations
   */
  #recordToRelationMap(record) {
    const relations = this.#recordToRelations(record);

    const relationMap = relations.reduce((acc, [pair, key, value]) => {
      const pairMap = acc[pair] ?? {};

      const values = pairMap[key] ?? [];

      const n = {  ...acc, [pair]: { ...pairMap, [key]: [value, ...values] } }

      return n
    }, {});

    return relationMap
  }

  /**
   * This saves a record to the dataset.
   * @name save
   * @param {object} record - A dataset record.
   * @function
   */
  #save(record) {
    // TODO if base is array, map array to multiple records

    const base = record._;

    // build a relation map of the record. tablet -> key -> list of values
    let relationMap = this.#recordToRelationMap(record);

    // iterate over leaves of leaves, the whole crown
    const crown = findCrown(this.#store.schema, base);

    crown.forEach((branch) => {
      const { trunk } = this.#store.schema[branch];

      const pair = `${trunk}-${branch}.csv`;

      const tablet = this.#store.getCache(pair);

      let isWrite = false;

      // for each line of tablet
      csv.parse(tablet, {
        step: (row) => {
          // TODO: if tag is empty, step should not step
          // TODO: remove this check
          if (row.data.length === 1 && row.data[0] === '' ) return

          const [key, value] = row.data;

          const keys = Object.keys(relationMap[pair] ?? {});

          const lineMatchesKey = keys.includes(key);

          if (lineMatchesKey) {
            // prune if line matches a key from relationMap
          } else {
            const dataEscaped = row.data.map((str) => str.replace(/\n/g, "\\n"))

            const line = csv.unparse([dataEscaped], { newline: "\n" });

            // append line to output
            this.#store.appendOutput(pair, line);
          }
        },
        complete: () => {

          // if flag unset and relation map not fully popped, set flag
          if (!isWrite) {
            const recordHasNewValues = Object.keys(relationMap[pair] ?? {}).length > 0;

            if (recordHasNewValues) {
              isWrite = true;
            }
          }

          // don't write tablet if changeset doesn't have anything on it
          // if flag set, append relation map to pruned
          if (isWrite) {
            // for each key in the changeset
            const keys = Object.keys(relationMap[pair]);

            const relations = keys.reduce((acc, key) => {
              // for each key value in the changeset
              const values = relationMap[pair][key];

              const keyRelations = values.map((value) => [key, value])

              const keyRelationsEscaped = keyRelations.map((strings) => strings.map((str) => str.replace(/\n/g, "\\n")))

              return [...keyRelationsEscaped, ...acc]
            }, []);

            const lines = csv.unparse(relations, { newline: "\n" });

            // append remaining relations to output
            this.#store.appendOutput(pair, lines);
          } else {
            // TODO: remove this check
            if (tablet !== '' && tablet !== undefined && tablet !== '\n') {
              // otherwise reset output to not change it
              this.#store.setOutput(pair, tablet)
            }
          }
        }
      })
    })
  }

  /**
   * This unlinks a branch value from all trunk values.
   * @name unlinkTrunks
   * @param {string} branch - A branch name.
   * @param {string} value - A branch value.
   * @function
   */
  async #unlinkTrunks(branch, value) {
    const { trunk } = this.#store.schema[branch];

    // unlink trunk if it exists
    if (trunk !== undefined) {
      // find trunkKeys
      const pairPath = `${trunk}-${branch}.csv`;

      const pairFile = this.#store.getCache(pairPath);

      if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
        return;
      }

      const pairPruned = pruneValue(pairFile, value);

      this.#store.setOutput(pairPath, `${pairPruned}\n`);
    }
  }

  /**
   * This unlinks a branch value from all values of a leaf branch.
   * @name unlinkLeaf
   * @param {string} branch - A branch name.
   * @param {string} value - A branch value.
   * @param {string} leaf - A leaf branch.
   * @function
   */
  async #unlinkLeaf(branch, value, leaf) {
      const pairPath = branch === "_"
            ? "_-_.csv"
            : `${branch}-${leaf}.csv`;

      const pairFile = this.#store.getCache(pairPath);
      // const pairFile = this.#store.getOutput(pairPath) ?? this.#store.getCache(pairPath);

      if (pairFile === '\n' || pairFile === '' || pairFile === undefined) {
        return;
      }

      const pairPruned = pruneKey(pairFile, value);

      this.#store.setOutput(pairPath, `${pairPruned}\n`);
  }

  /**
   * This unlinks a branch value from all leaf values.
   * @name unlinkLeaves
   * @param {string} branch - A branch name.
   * @param {string} value - A branch value.
   * @function
   */
  async #unlinkLeaves(branch, value) {
    // find all leaves
    const leaves = Object.keys(this.#store.schema)
      .filter((b) => this.#store.schema[b].trunk === branch);

    await Promise.all(leaves.map(
      async (leaf) => this.#unlinkLeaf(branch, value, leaf)
    ));
  }
}
