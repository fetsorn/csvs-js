/* eslint-disable import/extensions */
import { findSchemaRoot, findCrown, condense } from './schema.js';
import Store from './store.js';
import csv from 'papaparse';

/**
 * This pushes a value to the pair-key-value hashset
 * @name merge
 * @function
 * @param {HashSet} valueMap - pair-key-value hashset
 * @param {string} pair - entity relation.
 * @param {string} key - trunk value.
 * @param {string} value - leaf value.
 * @returns {HashSet}
 */
function merge(valueMap, pair, key, value) {
  const valuesByKey = valueMap[pair] ?? {};

  const values = valuesByKey[key] ?? [];

  const valuesNew = values.concat(value);

  const valuesByKeyNew = { ...valuesByKey, [key]: valuesNew };

  return { ...valueMap, [pair]: valuesByKeyNew };
}

/**
 * This returns values that match at least one of regexes
 * @name matchRegexes
 * @function
 * @param {string[]} regexes - list of regexes.
 * @param {string[]} values - list of values.
 * @returns {string[]}
 */
function matchRegexes(regexes, values) {
  return values.filter((value) => regexes.some((regex) => new RegExp(regex).test(value)))
}

/**
 * This returns values that appear in both as and bs
 * @name intersect
 * @function
 * @param {string[]} as - list of values.
 * @param {string[]} bs - list of values.
 * @returns {string[]}
 */
function intersect(as, bs) {
  return as.filter((a) => bs.includes(a))
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
    if (!searchParams.has('_')) {
      return []
    }

    const record = searchParams.entries().reduce((acc, [key, value]) => ({[key]: value}), {});

    console.log(record);

    const base = record._;

    // get a map of dataset file contents
    await this.#store.read(base);

    // get an array of records
    const records = await this.#foo(record);

    return records;
  }

  /**
   * counts number of leaves.
   * @name countLeaves
   * @function
   * @param {string} branch - dataset entity.
   * @returns {number} - number of leaves
   */
  #countLeaves(branch) {
    const leaves = Object.keys(this.#store.schema)
                         .filter((b) => this.#store.schema[b].trunk === branch);

    return leaves.length
  }

  /**
   * sort by level of nesting, twigs and leaves come first
   * @name sortByNesting
   * @function
   * @param {string} a - dataset entity.
   * @param {string} b - dataset entity.
   * @returns {number} - sorting index, a<b -1, a>b 1, a==b 0
   */
  #sortByNesting(a, b) {
    const { trunk: trunkA } = this.#store.schema[a];

    const { trunk: trunkB } = this.#store.schema[b];

    if (trunkA === b) {
      return -1
    }

    if (trunkB === a) {
      return 1
    }

    return this.#countLeaves(a) < this.#countLeaves(b)
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
   * This returns an array of records from the dataset.
   * @name buildRecord
   * @function
   * // TODO: replace HashSet type with a common tablet->key->value type docstring
   * @param {HashSet} valueMap - hashset of all relevant key-value relations.
   * @param {string} base - base branch.
   * @param {string} key - base key.
   * @returns {Object[]}
   */
  #buildRecord(valueMap, base, key) {
    const leaves = Object.keys(this.#store.schema)
                         .filter((b) => this.#store.schema[b].trunk === base);

    const record = leaves.reduce((acc, leaf) => {
      const pair = `${base}-${leaf}.csv`;

      const valuesByKey = valueMap[pair] ?? {};

      const values = valuesByKey[key];

      const partial = values === undefined
            ? {}
            : { [leaf]: values.map((value) => buildRecord(valueMap, leaf, value)) };

      return { ...acc, ...partial }
    }, { _:base, [base]: key })

    return record
  }

  /**
   * This returns an array of records from the dataset.
   * @name select
   * @function
   * @param {object} record - query record.
   * @returns {Object[]}
   */
  #foo(query) {
    const queryMap = this.#recordToRelationMap(query);

    // there can be only one root base in search query
    // TODO: validate against arrays of multiple bases, do not return [], throw error
    const base = query._;

    // list of branches
    const crown = findCrown(this.#store.schema, base);

    const isQueriedMap = crown.reduce((acc, branch) => {
      const queries = Object.keys(queryMap);

      const { trunk } = this.#store.schema[branch];

      const pair = `${trunk}-${branch}.csv`;

      const isQueried = queries[pair] !== undefined;

      return { ...acc, [branch]: isQueried }
    }, {});

    const queriedBranches = Object.keys(isQueriedMap)
                                  .sort(this.#sortByNesting);

    const restBranches = crown.filter((branch) => !isQueriedMap(branch))
                              .sort(this.#sortByNesting);

    // in order of query, queried branches go first
    const branches = queriedBranches.concat(restBranches);

    let keyMap = {};

    let valueMap = {};

    // TODO: does forEach work well with streaming csv parse?
    branches.forEach((branch) => {
      // TODO: what if multiple trunks?
      const { trunk } = this.#store.schema[branch];

      // if there's no trunk and is root, this is base
      // must come last
      // there can be only one root base in search query
      if (trunk === undefined) {
        // TODO if there were no regexes, then all values are assigned to "" in queryMap, check that instead
        const regexes = record[base];

        // TODO: if base is undefined in keyMap at this point, must return all keys?

        // if record has exact base regexes
        if (regexes !== undefined) {
          // TODO: bring out to general matchRegexes function
          const values = keyMap[branch]

          const keysNew = matchRegexes(regexes, values)

          // find all that intersect with keysMap[branch]
          keyMap[branch] = intersect(keyMap[branch], keysNew)
        }

        return undefined
      }

      const pair = `${trunk}-${branch}.csv`;

      const tablet = this.#store.getCache(pair);

      let keysTrunk = [];

      csv.parse(tablet, {
        step: (row) => {
          const [key, value] = row.data;

          // if branch is queried
          if (isQueriedMap) {
            // TODO: bring out to general matchRegexes function
            const regexes = queryMap[pair][key]

            const isMatch = regexes.some((regex) => new RegExp(regex).test(value))

            // if row matches at least one regex
            if (isMatch) {
              // push key to list of trunk keys
              keysTrunk.push(key)

              // TODO what if one key is pushed multiple times?
              // cache key value relation to valueMap
              valueMap = merge(valueMap, pair, key, value)
            }
          } else {
            // at this point all queried branches must be cached
            // and all leaves of this branch must be cached
            // and keysMap should have a list of trunk keys for this branch
            const keysTrunk = keysMap[trunk] ?? [];

            // if key is in keysMap[trunk]
            const searchResultHasKey = keysTrunk.includes(key)

            if (searchResultHasKey) {
              // cache value
              valueMap = merge(valueMap, pair, key, value)
            }
          }
        },
        complete: () => {
          // diff keys into keyMap
          const keysSet = new Set(keysTrunk);

          const keysTrunkMatched = keyMap[trunk];

          // save keys to map if trunk keys are undefined
          if (keysTrunkMatched === undefined) {
            keyMap[trunk] = keysSet
          } else {
            // intersection here if trunk is undefined?
            keyMap[trunk] = intersect(keysTrunkMatched, keysSet)
          }

        }
      })

      return undefined
    })

    const records = keyMap(base).map((key) => this.#buildRecord(valueMap, base, key))

    return records
  }
}
