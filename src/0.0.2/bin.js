import csv from "papaparse";

/**
 * This tells if a branch is connected to base branch.
 * @name isConnected
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} base - Base branch name.
 * @param {string} branch - Branch name.
 * @returns {Boolean}
 */
function isConnected(schema, base, branch) {
  const { trunk } = schema[branch];

  if (trunk === undefined) {
    // if schema root is reached, leaf is not connected to base
    return false;
  }
  if (trunk === base) {
    // if trunk is base, leaf is connected to base
    return true;
  }
  if (isConnected(schema, base, trunk)) {
    // if trunk is connected to base, leaf is also connected to base
    return true;
  }

  // if trunk is not connected to base, leaf is also not connected to base
  return false;
}

/**
 * This finds all branches that are connected to the base branch.
 * @name findCrown
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of leaf branches connected to the base branch.
 */
export function findCrown(schema, base) {
  return Object.keys(schema).filter((branch) =>
    isConnected(schema, base, branch),
  );
}

/**
 * This finds paths to all files required to search for base branch.
 * @name findStorePaths
 * @function
 * @param {object} schema - Dataset schema.
 * @param {string} base - Base branch name.
 * @returns {string[]} - Array of file paths.
 */
export function findCrownPaths(schema, base) {
  const crown = findCrown(schema, base);

  const filePaths = crown.concat([base]).map((branch) => {
    const schemaHasBranch = Object.prototype.hasOwnProperty.call(
      schema,
      branch,
    );

    if (schemaHasBranch) {
      const branchHasTrunk = Object.prototype.hasOwnProperty.call(
        schema[branch],
        "trunk",
      );

      if (branchHasTrunk) {
        const { trunk } = schema[branch];

        return `${trunk}-${branch}.csv`;
      }
    }
  });

  return filePaths.filter(Boolean).flat();
}

/**
 * This function is true when branch has no leaves
 * @name isTwig
 * @function
 * @param {object} schema - Dataset schema.
 * @param {object} record - An expanded record.
 * @returns {object} - A condensed record.
 */
export function isTwig(schema, branch) {
  return (
    Object.keys(schema).filter((b) => schema[b].trunk === branch).length === 0
  );
}

/**
 * This function condenses the data structure where possible
 * @name condense
 * @function
 * @param {object} schema - Dataset schema.
 * @param {object} record - An expanded record.
 * @returns {object} - A condensed record.
 */
export function condense(schema, record) {
  const base = record._;

  const entries = Object.entries(record);

  const entriesCondensed = entries
    .filter(([key]) => key !== "_" && key !== record._)
    .map(([branch, value]) => {
      if (Array.isArray(value)) {
        const itemsCondensed = isTwig(schema, branch)
          ? value.map((item) =>
              typeof item === "string" ? item : item[branch],
            )
          : value.map((item) => condense(schema, item));

        if (itemsCondensed.length === 0) {
          return undefined;
        }

        if (itemsCondensed.length === 1) {
          const valueCondensed = itemsCondensed[0];

          return [branch, valueCondensed];
        }

        return [branch, itemsCondensed];
      }

      if (typeof value === "object") {
        const valueCondensed = isTwig ? value[branch] : condense(schema, value);

        return [branch, valueCondensed];
      }

      if (typeof value === "string") {
        const valueCondensed = isTwig ? value : { _: branch, [branch]: value };

        return [branch, valueCondensed];
      }

      return undefined;
    });

  const recordCondensed = Object.fromEntries(entriesCondensed.filter(Boolean));

  return { ...recordCondensed, _: base, [base]: record[base] };
}

/**
 * This function expands the data structure
 * @name expand
 * @function
 * @param {object} record - A condensed record.
 * @returns {object} - An expanded record.
 */
export function expand(record) {
  const base = record._;

  const entries = Object.entries(record);

  // TODO: this is borked, fix
  const entriesExpanded = entries
    .filter(([key]) => key !== "_" && key !== record._)
    .map(([key, value]) => {
      const valueExpanded =
        typeof value === "string"
          ? [{ _: key, [key]: value }]
          : [value].flat().map(expand);

      return [key, valueExpanded];
    });

  const recordExpanded = Object.fromEntries(entriesExpanded);

  return { _: base, [base]: record[base], ...recordExpanded };
}

/**
 * This returns an array of records from the dataset.
 * @name searchParamsToQuery
 * @note for compatibility, remove after EOL of 0.0.1
 * @export function
 * @param {URLSearchParams} urlSearchParams - search params from a query string.
 * @returns {Object}
 */
export function searchParamsToQuery(schema, searchParams) {
  const urlSearchParams = new URLSearchParams(searchParams.toString());

  if (!urlSearchParams.has("_")) return {};

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
 * @returns {string[]} - A list of tuples (relation, key, value)
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
 * @name findStrategy
 * @export function
 * @param {object} schema -
 * @param {object} query -
 * @param {object} queryMap -
 * @param {object} isQueriedMap -
 * @param {string} base -
 * @returns {object[]} -
 */
function findStrategy(schema, query, queryMap, isQueriedMap, base) {
  // console.log("findStrategy", schema, queryMap, base)
  // in order of query,
  // first queried twigs
  // then queried trunks
  // then trunk of base
  // then base (either last queried or first unqueried),
  const queriedBranches = Object.keys(isQueriedMap).sort(
    sortNestingAscending(schema),
  );

  const queriedTablets = queriedBranches.map(
    (branch) => ({
      // what branch to set?
      thing: schema[branch].trunk,
      // what branch to match?
      trait: branch,
      // do we set first column?
      thingIsFirst: true,
      // do we match first column?
      traitIsFirst: false,
      tablet: `${schema[branch].trunk}-${branch}.csv`,
      regexes: Object.keys(queryMap[`${schema[branch].trunk}-${branch}.csv`])
                     .map((trunkRegex) => queryMap[`${schema[branch].trunk}-${branch}.csv`][trunkRegex])
                     .flat(),
      hasConstraints: true
    }),
  );

  // console.log("queriedTablets", queriedTablets)

  const isBaseLeaf = schema[base].trunk !== undefined;

  // if base is leaf, parse the trunk relationship
  const trunkTablet = {
    // what branch to set?
    thing: base,
    // what branch to match?
    trait: schema[base].trunk,
    // do we set first column?
    thingIsFirst: false,
    // do we match first column?
    traitIsFirst: false,
    tablet: `${schema[base].trunk}-${base}.csv`,
    regexes: [query[base] ?? ""]
  };

  const leaves = Object.keys(schema).filter(
    (b) => schema[b].trunk === base,
  );

  const isLeafQueried = queriedBranches.some((branch)=> leaves.includes(branch))

  // console.log("isLeafQueried", isLeafQueried)

  const leafTablets = isLeafQueried ? [] : leaves.map(
    (leaf) => ({
      // what branch to set?
      thing: leaf,
      // what branch to match?
      trait: base,
      // do we set first column?
      thingIsFirst: true,
      // do we match first column?
      traitIsFirst: true,
      tablet: `${base}-${leaf}.csv`,
      regexes: [query[base] ?? ""],
      isAppend: true
    }),
  );

  // console.log("leafTablets", leafTablets)

  const baseTablets = isBaseLeaf ? [trunkTablet] : leafTablets;

  // if at least one leaf is queried, don't parse other leaves
  // if only datum is queried query all leaves
  const strategy = queriedTablets.concat(baseTablets);

  // console.log("findStrategy =", strategy)

  return strategy
}

// TODO: split findKeys into search strategies
// TODO: remove keys of queryMap from keyMap
// "?_=datum&datum=notInDataset" returns [ { _: datum, datum: notInDataset } ]
/**
 *
 * @name findKeys
 * @export function
 * @param {object} schema -
 * @param {object} cache -
 * @param {object} query -
 * @param {object} queryMap -
 * @param {object} isQueriedMap -
 * @param {string} base -
 * @returns {string[]} -
 */
export async function findKeys(
  schema,
  cache,
  query,
  queryMap,
  isQueriedMap,
  base,
) {
  const keyMap = {};

  const stages = findStrategy(schema, query, queryMap, isQueriedMap, base)

  for (const stage of stages) {
    console.log(stage, keyMap)
    // TODO: rename keys to something else
    const keys = [];

    await new Promise((res) => {
      csv.parse(cache[stage.tablet], {
        step: (row) => {
          // ignore empty newline
          if (row.data.length === 1 && row.data[0] === "") return;

          const [fst, snd] = row.data;

          if (stage.hasConstraints) {
            const failsConstraints =
                  keyMap[stage.trait] !== undefined &&
                  !keyMap[stage.trait].includes(stage.traitIsFirst ? fst : snd);

            if (failsConstraints) return;
          }

          // does key match regex?
          const isMatch = matchRegexes(
            stage.regexes,
            // TODO replace this with .some()
            [stage.traitIsFirst ? fst : snd]
          ).length > 0;

          if (isMatch) {
            // push to keys
            keys.push(stage.thingIsFirst ? fst : snd);
          }
        },
        complete: () => {
          console.log(keys)
          // set in keyMap
          if (stage.isAppend) {
            keyMap[base] = Array.from(new Set([...keys, ...(keyMap[stage.thing] ?? [])]));
          } else if (keyMap[stage.thing] === undefined) {
            keyMap[stage.thing] = Array.from(new Set(keys));
          } else {
            keyMap[stage.thing] = intersect(
              keyMap[stage.thing],
              Array.from(new Set(keys))
            );
          }

          res();
        },
      });
    });
  }

  // TODO skip this when isLeafQueried
  if (keyMap[base] !== undefined) {
    const regexesBase = [query[base] ?? ""];

    keyMap[base] = matchRegexes(regexesBase, keyMap[base]);
  }

  return keyMap[base] ?? [];
}

/**
 * lookup all values of branch in valueMap
 * @name lookupBranchValues
 * @export function
 * @param {object} schema -
 * @param {object} valueMap -
 * @param {string} branch -
 * @returns {string[]} -
 */
function lookupBranchValues(schema, valueMap, branch) {
  // TODO handle if trunk is undefined for some reason, shouldn't happen
  const { trunk } = schema[branch];

  // if there's no trunk pair in valueMap and trunk is root, return empty list
  if (trunk === undefined) return [];

  const pair = `${trunk}-${branch}.csv`;

  const pairValues = valueMap[pair];

  // if there's no trunk pair yet in valueMap call foo recursively until base
  if (pairValues === undefined) {
    return lookupBranchValues(schema, valueMap, trunk);
  }

  const branchValues = Object.entries(pairValues).reduce((acc, [, values]) => {
    return Array.from(new Set([...acc, ...values]));
  }, []);

  return branchValues;
}

/**
 * build a hashset of pair to key to values
 * @name findValues
 * @export function
 * @param {object} schema -
 * @param {object} cache -
 * @param {string} base -
 * @param {string[]} baseKeys -
 * @returns {object} -
 */
export async function findValues(schema, cache, base, baseKeys) {
  let valueMap = {};

  const crown = findCrown(schema, base);

  // first trunks, then leaves
  const crownDescending = crown.sort(sortNestingDescending(schema));

  // TODO: does forEach work well with streaming csv parse?
  for (const branch of crownDescending) {
    // TODO: what if multiple trunks?
    const { trunk } = schema[branch];

    // TODO: cache unsearched branches last, only for found base keys, to cut cache size
    // TODO: determine if branch already cached all needed keys
    // parse all branches, skip queried if already cached all needed keys
    // skip parsing if branch won't be used to build a record

    const pair = `${trunk}-${branch}.csv`;

    const tablet = cache[pair];

    const keysTrunk =
      trunk === base ? baseKeys : lookupBranchValues(schema, valueMap, trunk);

    await new Promise((res) => {
      csv.parse(tablet, {
        step: (row) => {
          // ignore empty newline
          if (row.data.length === 1 && row.data[0] === "") return;

          const [key, value] = row.data.map((str) => str.replace(/\\n/g, "\n"));

          // if key is in trunk keys
          const searchResultHasKey = keysTrunk.includes(key);

          if (searchResultHasKey) {
            // cache value
            valueMap = merge(valueMap, pair, key, value);
          }
        },
        complete: () => {
          res();
        },
      });
    });
  }

  return valueMap;
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
