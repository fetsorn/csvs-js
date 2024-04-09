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

  const valueMapNew = { ...valueMap, [pair]: valuesByKeyNew };

  return valueMapNew
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

    const query = Array.from(searchParams.entries()).reduce(
      (acc, [key, value]) => ({...acc, [key]: value}), {}
    );

    const base = query._;

    // get a map of dataset file contents
    await this.#store.read(base);

    // get an array of records
    const records = await this.#foo(query);

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
   * @name sortNestingAscending
   * @function
   * @param {string} a - dataset entity.
   * @param {string} b - dataset entity.
   * @returns {number} - sorting index, a<b -1, a>b 1, a==b 0
   */
  #sortNestingAscending(a, b) {
    const { trunk: trunkA } = this.#store.schema[a];

    const { trunk: trunkB } = this.#store.schema[b];

    if (trunkA === b) {
      return -1
    }

    if (trunkB === a) {
      return 1
    }

    if (this.#countLeaves(a) < this.#countLeaves(b)) {
      return -1
    }

    if (this.#countLeaves(a) > this.#countLeaves(b)) {
      return 1
    }

    return 0
  }

  /**
   * sort by level of nesting, trunks come first
   * @name sortNestingDescending
   * @function
   * @param {string} a - dataset entity.
   * @param {string} b - dataset entity.
   * @returns {number} - sorting index, a<b -1, a>b 1, a==b 0
   */
  #sortNestingDescending(a, b) {
    const { trunk: trunkA } = this.#store.schema[a];

    const { trunk: trunkB } = this.#store.schema[b];

    if (trunkB === a) {
      return -1
    }

    if (trunkA === b) {
      return 1
    }

    if (this.#countLeaves(a) > this.#countLeaves(b)) {
      return -1
    }

    if (this.#countLeaves(a) < this.#countLeaves(b)) {
      return 1
    }

    return 0
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
            : { [leaf]: values.map((value) => this.#buildRecord(valueMap, leaf, value)) };

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
      const { trunk } = this.#store.schema[branch];

      const pair = `${trunk}-${branch}.csv`;

      const queries = queryMap[pair];

      const isQueried = queries !== undefined;

      const partial = isQueried ? { [branch]: isQueried } : {};

      return { ...acc, ...partial };
    }, {});

    const queriedBranches = Object.keys(isQueriedMap)
                                  .sort(this.#sortNestingAscending.bind(this));

    const restBranchesUnsorted = crown.filter((branch) => !isQueriedMap[branch])

    const restBranches = restBranchesUnsorted.sort(this.#sortNestingDescending.bind(this));

    // in order of query,
    // queried twigs go first
    // then queried trunks
    // then base (either last queried or first unqueried),
    // then unqueried trunks,
    // then unqueried leaves and twigs
    const branches = queriedBranches.concat([base]).concat(restBranches);

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
        const regexes = query[base] ?? [ "" ];

        // if query has exact base regexes

        // TODO: bring out to general matchRegexes function
        const values = keyMap[branch]

        // TODO: if base is undefined in keyMap at this point, match all keys
        // TODO: "option" case, move inside csv.parse
        // TODO: this should not happen, relation map should collapse to "": "" and match all base keys before reaching base
        if (values === undefined) {
          const allBaseKeys = ""

          keyMap[branch] = allBaseKeys
        } else {
          const keysNew = matchRegexes(regexes, values)

          // find all that intersect with keyMap[branch]
          keyMap[branch] = intersect(keyMap[branch], keysNew)
        }

        return undefined
      }

      // skip parsing if branch won't be used to build a record
      const noKeys = keyMap[trunk] === undefined || keyMap[trunk] === [];

      const skipCache = !isQueriedMap && noKeys;

      if (skipCache) {
        return undefined
      }

      const pair = `${trunk}-${branch}.csv`;

      const tablet = this.#store.getCache(pair);

      let keysTrunk = [];

      csv.parse(tablet, {
        step: (row) => {
          const [key, value] = row.data;

          // if branch is queried
          if (isQueriedMap[branch]) {
            // TODO here we must find branch regexes for each of the trunk regexes that match key
            const trunkRegexes = Object.keys(queryMap[pair]);

            // TODO validate trunkRegexes are not undefined

            const trunkRegexesMatchKey = trunkRegexes.filter((trunkRegex) => new RegExp(trunkRegex).test(key))

            const branchRegexes = trunkRegexes.map((trunkRegex) => queryMap[pair][trunkRegex]).flat();

            // TODO; validate branchRegexes are not undefined

            const isMatch = matchRegexes(branchRegexes, [value]).length > 0;

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
            // and leaves of this branch are not cached
            // if keyMap has a list of trunk keys for this branch, cache all values for matching key
            // if keyMap does not have a list of trunk keys, none of the values are needed to build search result records
            // this will set
            const keysTrunkOld = keyMap[trunk] ?? [];

            // if key is in keyMap[trunk]
            const searchResultHasKey = keysTrunkOld.includes(key);

            if (searchResultHasKey) {
              // cache value
              valueMap = merge(valueMap, pair, key, value)
              // push to keyMap here if branch has leaves
              const keysBranchOld = keyMap[branch] ?? [];

              const keysBranch = [ ...keysBranchOld, value ];

              keyMap[branch] = keysBranch;
            }
          }
        },
        complete: () => {
          // diff keys into keyMap
          const keysSet = Array.from(new Set(keysTrunk));

          const keysTrunkMatched = keyMap[trunk];

          // save keys to map if trunk keys are undefined
          if (keysTrunkMatched === undefined) {
            keyMap[trunk] = keysSet;
          } else {
            // if queried less trunk keys, intersect
            if (isQueriedMap[branch]) {
              keyMap[trunk] = intersect(keysTrunkMatched, keysSet)
            }
            // if not queried, leave trunk keys unchanged
            // TODO: we must save keyMap[branch] here for unqueried trunk like filepath
          }

        }
      })

      return undefined
    })

    const records = keyMap[base].map((key) => this.#buildRecord(valueMap, base, key))
                                .map((record) => condense(this.#store.schema, record))

    return records
  }
}
