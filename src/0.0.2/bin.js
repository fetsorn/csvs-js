import csv from "papaparse";
import { findCrown } from "./schema.js";
/**
 * This returns an array of records from the dataset.
 * @name searchParamsToQuery
 * @note for compatibility, remove after EOL of 0.0.1
 * @export function
 * @param {URLSearchParams} urlSearchParams - search params from a query string.
 * @returns {Object}
 */
export function searchParamsToQuery(schema, urlSearchParams) {
  const base = urlSearchParams.get("_");

  urlSearchParams.delete("_");

  const entries = Array.from(urlSearchParams.entries());

  // TODO: if key is leaf, add it to value of trunk
  const query = entries.reduce(
    (acc, [branch, value]) => {
      // TODO: can handly only two levels of nesting, suffices for compatibility
      // push to [trunk]: { [key]: [ value ] }

      const { trunk: trunk1 } = schema[branch];

      if (trunk1 === base || branch === base) {
        return { ...acc, [branch]: value };
      }
      const { trunk: trunk2 } = schema[trunk1];

      if (trunk2 === base) {
        const trunk1Record = acc[trunk1] ?? { _: trunk1 };

        return { ...acc, [trunk1]: { ...trunk1Record, [branch]: value } };
      }
      const { trunk: trunk3 } = schema[trunk2];

      if (trunk3 === base) {
        const trunk2Record = acc[trunk2] ?? { _: trunk2 };

        const trunk1Record = trunk2Record[trunk1] ?? { _: trunk1 };

        return {
          ...acc,
          [trunk2]: {
            ...trunk2Record,
            [trunk1]: {
              ...trunk1Record,
              [branch]: value,
            },
          },
        };
      }

      return acc;
    },
    { _: base },
  );

  return query;
}

/**
 * This collapses a nested record into a list of key-value relations
 * @name recordToRelations
 * @param {object} record - A dataset record.
 * @export function
 * @returns {string[3][]} - A list of tuples (relation, key, value)
 */
export function recordToRelations(schema, record) {
  // { _: trunk, trunk: key, leaf: value, leaf: [ value ], leaf: { _: leaf, leaf: value } }

  const base = record._;

  // skip if record doesn't have the base
  if (record._ === undefined) return [];

  const key = record[base] ?? "";

  const leaves = Object.keys(schema).filter(
    (branch) => schema[branch].trunk === base,
  );

  const bar = leaves.reduce((accLeaf, leaf) => {
    // skip if record doesn't have the leaf
    if (record[leaf] === undefined) return accLeaf;

    const values = Array.isArray(record[leaf]) ? record[leaf] : [record[leaf]];

    const pair = `${base}-${leaf}.csv`;

    const foo = values.reduce((accValue, value) => {
      if (typeof value === "string") {
        return [[pair, key, value]];
      }

      const valueNested = value[leaf] ?? "";

      const qux = recordToRelations(schema, value);

      return [...accValue, [pair, key, valueNested], ...qux];
    }, []);

    return [...accLeaf, ...foo];
  }, []);

  return bar;
}

/**
 * This collapses a nested record into a map of key-value relations
 * @name recordToRelations
 * @param {object} record - A dataset record.
 * @export function
 * @returns {object} - A map of key-value relations
 */
export function recordToRelationMap(schema, record) {
  const relations = recordToRelations(schema, record);

  const relationMap = relations.reduce((acc, [pair, key, value]) => {
    const pairMap = acc[pair] ?? {};

    const values = pairMap[key] ?? [];

    const foo = { ...acc, [pair]: { ...pairMap, [key]: [value, ...values] } };

    return foo;
  }, {});

  return relationMap;
}

/**
 * This returns an array of records from the dataset.
 * @name buildRecord
 * @export function
 * // TODO: replace HashSet type with a common tablet->key->value type docstring
 * @param {HashSet} valueMap - hashset of all relevant key-value relations.
 * @param {string} base - base branch.
 * @param {string} key - base key.
 * @returns {Object[]}
 */
export function buildRecord(schema, valueMap, base, key) {
  const leaves = Object.keys(schema).filter((b) => schema[b].trunk === base);

  const record = leaves.reduce(
    (acc, leaf) => {
      const pair = `${base}-${leaf}.csv`;

      const valuesByKey = valueMap[pair] ?? {};

      const values = valuesByKey[key];

      const partial =
        values === undefined
          ? {}
          : {
              [leaf]: values.map((value) =>
                buildRecord(schema, valueMap, leaf, value),
              ),
            };

      return { ...acc, ...partial };
    },
    { _: base, [base]: key },
  );

  return record;
}

/**
 * This pushes a value to the pair-key-value hashset
 * @name merge
 * @export function
 * @param {HashSet} valueMap - pair-key-value hashset
 * @param {string} pair - entity relation.
 * @param {string} key - trunk value.
 * @param {string} value - leaf value.
 * @returns {HashSet}
 */
export function merge(valueMap, pair, key, value) {
  const valuesByKey = valueMap[pair] ?? {};

  const values = valuesByKey[key] ?? [];

  const valuesNew = values.concat(value);

  const valuesByKeyNew = { ...valuesByKey, [key]: valuesNew };

  const valueMapNew = { ...valueMap, [pair]: valuesByKeyNew };

  return valueMapNew;
}

/**
 * This returns values that match at least one of regexes
 * @name matchRegexes
 * @export function
 * @param {string[]} regexes - list of regexes.
 * @param {string[]} values - list of values.
 * @returns {string[]}
 */
export function matchRegexes(regexes, values) {
  return values.filter((value) =>
    regexes.some((regex) => new RegExp(regex).test(value)),
  );
}

/**
 * This returns values that appear in both as and bs
 * @name intersect
 * @export function
 * @param {string[]} as - list of values.
 * @param {string[]} bs - list of values.
 * @returns {string[]}
 */
export function intersect(as, bs) {
  return as.filter((a) => bs.includes(a));
}

/**
 * counts number of leaves.
 * @name countLeaves
 * @export function
 * @param {string} branch - dataset entity.
 * @returns {number} - number of leaves
 */
export function countLeaves(schema, branch) {
  const leaves = Object.keys(schema).filter((b) => schema[b].trunk === branch);

  return leaves.length;
}

/**
 * sort by level of nesting, twigs and leaves come first
 * @name sortNestingAscending
 * @export function
 * @param {string} a - dataset entity.
 * @param {string} b - dataset entity.
 * @returns {number} - sorting index, a<b -1, a>b 1, a==b 0
 */
export function sortNestingAscending(schema) {
  return (a, b) => {
    const { trunk: trunkA } = schema[a];

    const { trunk: trunkB } = schema[b];

    if (trunkA === b) {
      return -1;
    }

    if (trunkB === a) {
      return 1;
    }

    if (countLeaves(schema, a) < countLeaves(schema, b)) {
      return -1;
    }

    if (countLeaves(schema, a) > countLeaves(schema, b)) {
      return 1;
    }

    return 0;
  };
}

/**
 * sort by level of nesting, trunks come first
 * @name sortNestingDescending
 * @export function
 * @param {string} a - dataset entity.
 * @param {string} b - dataset entity.
 * @returns {number} - sorting index, a<b -1, a>b 1, a==b 0
 */
export function sortNestingDescending(schema) {
  return (a, b) => {
    const { trunk: trunkA } = schema[a];

    const { trunk: trunkB } = schema[b];

    if (trunkB === a) {
      return -1;
    }

    if (trunkA === b) {
      return 1;
    }

    if (countLeaves(schema, a) > countLeaves(schema, b)) {
      return -1;
    }

    if (countLeaves(schema, a) < countLeaves(schema, b)) {
      return 1;
    }

    return 0;
  };
}

/**
 *
 * @name findQueries
 * @export function
 * @param {object} schema -
 * @param {object} queryMap -
 * @param {string} base -
 * @returns {object} -
 */
export function findQueries(schema, queryMap, base) {
  // list of branches
  const crown = findCrown(schema, base).sort(sortNestingAscending(schema));

  const isQueriedMap = crown.reduce((acc, branch) => {
    const { trunk } = schema[branch];

    const pair = `${trunk}-${branch}.csv`;

    const queries = queryMap[pair];

    const isQueried = queries !== undefined;

    const partial = isQueried ? { [branch]: isQueried } : {};

    return { ...acc, ...partial };
  }, {});

  return isQueriedMap;
}

/**
 *
 * @name findKeys
 * @export function
 * @param {object} schema -
 * @param {object} cache -
 * @param {object} queryMap -
 * @param {object} isQueriedMap -
 * @param {string} base -
 * @returns {object} -
 */
export function findKeys(schema, cache, query, queryMap, isQueriedMap, base) {
  // in order of query,
  // queried twigs go first
  // then queried trunks
  // then base (either last queried or first unqueried),
  // then unqueried trunks,
  // then unqueried leaves and twigs
  // const branches = queriedBranches.concat([base]).concat(restBranches);
  const queriedBranches = Object.keys(isQueriedMap).sort(
    sortNestingAscending(schema),
  );
  const keyMap = {};

  // parse queried branches
  queriedBranches.forEach((branch) => {
    // TODO: what if multiple trunks?
    const { trunk } = schema[branch];

    const pair = `${trunk}-${branch}.csv`;

    const tablet = cache[pair];

    const keysTrunk = [];

    csv.parse(tablet, {
      step: (row) => {
        // TODO: if tag is empty, step should not step
        // TODO: remove this check
        if (row.data.length === 1 && row.data[0] === "") return;

        const [key, value] = row.data;

        // if branch is queried
        const keysBranch = keyMap[branch];

        // not constrained by leaves
        const branchNotConstrained = keysBranch === undefined;

        const valueFitsConstraints =
          keysBranch !== undefined && keysBranch.includes(value);

        const keyCanMatch = branchNotConstrained || valueFitsConstraints;

        if (keyCanMatch) {
          // TODO here we must find branch regexes for each of the trunk regexes that match key
          const trunkRegexes = Object.keys(queryMap[pair]);

          // TODO validate trunkRegexes are not undefined

          // const trunkRegexesMatchKey = trunkRegexes.filter((trunkRegex) =>
          //   new RegExp(trunkRegex).test(key),
          // );

          const branchRegexes = trunkRegexes
            .map((trunkRegex) => queryMap[pair][trunkRegex])
            .flat();

          // TODO; validate branchRegexes are not undefined

          const isMatch = matchRegexes(branchRegexes, [value]).length > 0;

          // if row matches at least one regex
          if (isMatch) {
            // push key to list of trunk keys
            keysTrunk.push(key);

            // TODO what if one key is pushed multiple times?
            // cache key value relation to valueMap
            // valueMap = merge(valueMap, pair, key, value)
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
          keyMap[trunk] = intersect(keysTrunkMatched, keysSet);
          // if not queried, leave trunk keys unchanged
        }
      },
    });

    return undefined;
  });

  // keyMap[export_tags] here must be [20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49]
  const isQueriedBase = query[base];

  if (isQueriedBase) {
    keyMap[base] = [query[base]];
  }

  // if base is not queried,
  return keyMap;
}

/**
 *
 * @name findValues
 * @export function
 * @param {object} schema -
 * @param {object} cache -
 * @param {object} queryMap -
 * @param {string} base -
 * @returns {object} -
 */
export function findValues(schema, cache, keyMap, base) {
  let valueMap = {};

  const crown = findCrown(schema, base).sort(sortNestingAscending(schema));

  const crownDescending = crown.sort(sortNestingDescending(schema));

  // TODO: does forEach work well with streaming csv parse?
  crownDescending.forEach((branch) => {
    // TODO: what if multiple trunks?
    const { trunk } = schema[branch];

    // TODO: determine if branch already cached all needed keys
    // parse all branches, skip queried if already cached all needed keys

    // skip parsing if branch won't be used to build a record
    // const noTrunkKeys = keyMap[trunk] === undefined || keyMap[trunk] === [];

    // const skipCache = !isQueriedMap[branch] && noTrunkKeys;

    // if (skipCache) {
    //   return undefined
    // }

    const pair = `${trunk}-${branch}.csv`;

    const tablet = cache[pair];

    const keysTrunk = [];

    csv.parse(tablet, {
      step: (row) => {
        // TODO: if tag is empty, step should not step
        // TODO: remove this check
        if (row.data.length === 1 && row.data[0] === "") return;

        const [key, value] = row.data;

        // if branch is queried
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
          valueMap = merge(valueMap, pair, key, value);
          // push to keyMap here if branch has leaves
          const keysBranchOld = keyMap[branch] ?? [];

          const keysBranch = [...keysBranchOld, value];

          keyMap[branch] = keysBranch;
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
          // if not queried, leave trunk keys unchanged
        }
      },
    });

    return undefined;
  });

  return valueMap;
}
