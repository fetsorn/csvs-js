import csv from "papaparse";
import stream from "stream";
// for polyfills use promisify instead of stream/promises.pipeline
import { promisify } from "util";

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

  urlSearchParams.delete("__");

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

  // [ "base-leaf.csv", "key", "value" ]
  const relations = leaves.reduce((accLeaf, leaf) => {
    // skip if record doesn't have the leaf
    if (record[leaf] === undefined) return accLeaf;

    const values = Array.isArray(record[leaf]) ? record[leaf] : [record[leaf]];

    const pair = `${base}-${leaf}.csv`;

    const relationsLeaf = values.reduce((accValue, value) => {
      if (typeof value === "string") {
        return [...accValue, [pair, key, value]];
      }

      const valueNested = value[leaf] ?? "";

      const relationsNested = recordToRelations(schema, value);

      return [...accValue, [pair, key, valueNested], ...relationsNested];
    }, []);

    return [...accLeaf, ...relationsLeaf];
  }, []);

  return relations;
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
export function findStrategy(schema, query, queryMap, isQueriedMap, base) {
  // console.log("findStrategy", query)
  // in order of query,
  // first queried twigs
  // then queried trunks
  // then trunk of base
  // then base (either last queried or first unqueried),
  const queriedBranches = Object.keys(isQueriedMap).sort(
    sortNestingAscending(schema),
  );

  const queriedTablets = queriedBranches.map((branch) => ({
    // what branch to set?
    thing: schema[branch].trunk,
    // what branch to match?
    trait: branch,
    // do we set first column?
    thingIsFirst: true,
    // do we match first column?
    traitIsFirst: false,
    filename: `${schema[branch].trunk}-${branch}.csv`,
    regexes: Object.keys(queryMap[`${schema[branch].trunk}-${branch}.csv`])
      .map(
        (trunkRegex) =>
          queryMap[`${schema[branch].trunk}-${branch}.csv`][trunkRegex],
      )
      .flat(),
    hasConstraints: true,
  }));

  const queriedGroups = queriedTablets.reduce(
    (acc, tablet) => {
      const leavesNumber = countLeaves(schema, tablet.trait);

      if (leavesNumber < acc.nestingLevel) {
        throw "unexpected sorting order of branches";
      }

      const nestingLevel =
        leavesNumber === acc.nestingLevel
          ? acc.nestingLevel
          : acc.nestingLevel + 1;

      const rest = acc.groups.slice(0, -1);

      const current = (acc.groups.slice(-1) ?? [])[0] ?? [];

      const groups =
        leavesNumber === acc.nestingLevel
          ? rest.concat([current.concat([tablet])])
          : acc.groups.concat([[tablet]]);

      return { nestingLevel, groups };
    },
    { nestingLevel: 0, groups: [] },
  ).groups;

  const baseHasTrunk = schema[base].trunk !== undefined;

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
    filename: `${schema[base].trunk}-${base}.csv`,
    regexes: [query[base] ?? ""],
  };

  const leaves = Object.keys(schema).filter((b) => schema[b].trunk === base);

  // const isLeafQueried = queriedBranches.some((branch) =>
  //   leaves.includes(branch),
  // );

  const leafTablets = leaves.map((leaf) => ({
    // what branch to set?
    thing: base,
    // what branch to match?
    trait: base,
    // do we set first column?
    thingIsFirst: true,
    // do we match first column?
    traitIsFirst: true,
    filename: `${base}-${leaf}.csv`,
    regexes: [query[base] ?? ""],
    isAppend: true,
  }));

  // const baseGroups = baseHasTrunk ? [[trunkTablet]] : [leafTablets];
  const basePartial = baseHasTrunk ? [[trunkTablet]] : [];

  // if at least one leaf is queried, don't parse other leaves
  // if only datum is queried query all leaves
  const leafPartial = queriedBranches.length === 0 ? [leafTablets] : [];

  const strategy = [...queriedGroups, ...basePartial, ...leafPartial];

  return strategy;
}

/**
 *
 * @name parseLine
 * @export function
 * @param {object} keyMap -
 * @param {object} stage -
 * @param {string} line -
 * @returns {string | undefined} -
 */
function parseLine(keyMap, stage, line) {
  // ignore empty newline
  if (line === "") return undefined;

  const {
    data: [row],
  } = csv.parse(line);

  const [fst, snd] = row;

  if (stage.hasConstraints) {
    const failsConstraints =
      keyMap[stage.trait] !== undefined &&
      !keyMap[stage.trait].includes(stage.traitIsFirst ? fst : snd);

    if (failsConstraints) return undefined;
  }

  // does key match regex?
  const isMatch =
    matchRegexes(
      stage.regexes,
      // TODO replace this with .some()
      [stage.traitIsFirst ? fst : snd],
    ).length > 0;

  if (isMatch) {
    // push to keys
    return stage.thingIsFirst ? fst : snd;
  }
}

/**
 *
 * @name parseTablet
 * @export function
 * @param {object} keyMap -
 * @param {object} cache -
 * @param {object} stage -
 * @returns {object} -
 */
function parseTablet(keyMap, cache, stage) {
  const lines = cache[stage.filename].split("\n");

  // TODO: rename keys to something else
  const keys = lines
    .map((line) => parseLine(keyMap, stage, line))
    .filter((key) => key !== undefined);

  // const keyMapStage = completeTablet(keyMap, stage, keys);

  if (stage.isAppend) {
    const keyMapStage = Array.from(new Set([...keys, ...(keyMap[stage.thing] ?? [])]));

    return { [stage.thing]: keyMapStage };
  }

  if (keyMap[stage.thing] === undefined) {
    const keyMapStage = Array.from(new Set(keys));

    return { [stage.thing]: keyMapStage };
  }

  const keyMapStage = intersect(keyMap[stage.thing], Array.from(new Set(keys)));

  return { [stage.thing]: keyMapStage };
}

export async function findKeys(
  schema,
  cache,
  query,
  queryMap,
  isQueriedMap,
  base,
) {
  const groups = findStrategy(schema, query, queryMap, isQueriedMap, base);

  // each group of tablets must be parsed in succession
  const keyMap = groups.reduce(
    // each tablet in a group can be parsed in parallel
    // and keyMap partials merged on completion
    (accGroup, group) => group.reduce(
        (accStage, stage) =>  ({
            ...accStage,
            ...parseTablet(accStage, cache, stage),
          }),
        accGroup,
      ),
    {},
  );

  const { trunk } = schema[base];

  if (trunk === undefined) {
    // base is root
    const valuesBase = keyMap[base];

    const regexesBase = [query[base] ?? ""];

    if (valuesBase !== undefined) {
      const keysBase = matchRegexes(regexesBase, valuesBase);

      keyMap[base] = keysBase;
    }
  }

  return keyMap[base] ?? [];
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
 * @param {object} queryMap -
 * @param {object} isQueriedMap -
 * @param {string} base -
 * @returns {string[]} -
 */
export async function findKeysOld(
  schema,
  cache,
  query,
  queryMap,
  isQueriedMap,
  base,
) {
  const keyMap = {};

  // in order of query,
  // first queried twigs
  // then queried trunks
  // then trunk of base
  // then base (either last queried or first unqueried),
  const queriedBranches = Object.keys(isQueriedMap).sort(
    sortNestingAscending(schema),
  );

  // parse queried branches
  for (const branch of queriedBranches) {
    // TODO: what if multiple trunks?
    const { trunk } = schema[branch];

    const pair = `${trunk}-${branch}.csv`;

    const tablet = cache[pair];

    const keysTrunk = [];

    await new Promise((res) => {
      csv.parse(tablet, {
        step: (row) => {
          // ignore empty newline
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
          res();
        },
      });
    });
  }

  // TODO: handle if query[base] is object, list of objects
  const regexesBase = [query[base] ?? ""];

  const { trunk } = schema[base];

  if (trunk !== undefined) {
    const pair = `${trunk}-${base}.csv`;

    const tablet = cache[pair];

    let keysBase = [];

    await new Promise((res) => {
      csv.parse(tablet, {
        step: (row) => {
          if (row.data.length === 1 && row.data[0] === "") return;

          const [, value] = row.data;

          // push value to keyMap
          const isMatch = matchRegexes(regexesBase, [value]).length > 0;

          if (isMatch) {
            keysBase.push(value);
          }
        },
        complete: () => {
          // diff keys into keyMap
          const keysSet = Array.from(new Set(keysBase));

          const keysBaseMatched = keyMap[base];

          // save keys to map if trunk keys are undefined
          if (keysBaseMatched === undefined) {
            keyMap[base] = keysSet;
          } else {
            // if queried less trunk keys, intersect
            keyMap[base] = intersect(keysBaseMatched, keysSet);
            // if not queried, leave trunk keys unchanged
          }
          res();
        },
      });
    });
  }

  // TODO: if only base is queried, keyMap is undefined at the end of leaves
  // we need to query all leaves for the datum regexes, defaulting to [ "" ]
  if (queriedBranches.length === 0) {
    const leaves = Object.keys(schema).filter(
      (b) => schema[b].trunk === base,
    );

    for (const leaf of leaves) {
      const pair = `${base}-${leaf}.csv`;

      const tablet = cache[pair];

      const keysBase = [];

      await new Promise((res) => {
        csv.parse(tablet, {
          step: (row) => {
            if (row.data.length === 1 && row.data[0] === "") return;

            const [key] = row.data;
            // match
            const isMatch = matchRegexes(regexesBase, [key]).length > 0;

            if (isMatch) {
              keysBase.push(key);
            }
          },
          complete: () => {
            // TODO: intersect or append here
            const oldKeys = keyMap[base] ?? [];

            // we know that keyMap is undefined
            keyMap[base] = Array.from(new Set([...keysBase, ...oldKeys]));

            res();
          },
        });
      });
    }
  }

  if (trunk === undefined) {
    // base is root
    const valuesBase = keyMap[base];

    if (valuesBase !== undefined) {
      const keysBase = matchRegexes(regexesBase, valuesBase);

      keyMap[base] = keysBase;
    }
  }

  // if base is not queried,
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

// add trunk field from schema record to branch records
// turn { _: _, branch1: [ branch2 ] }, [{ _: branch, branch: "branch2", task: "date" }]
// into [{ _: branch, branch: "branch2", trunk: "branch1", task: "date" }]
export function enrichBranchRecords(schemaRecord, metaRecords) {
  // [[branch1, [branch2]]]
  const schemaRelations = Object.entries(schemaRecord).filter(
    ([ key ]) => key !== "_",
  );

  // list of unique branches in the schema
  const branches = [...new Set(schemaRelations.flat(Infinity))];

  const branchRecords = branches.reduce((accBranch, branch) => {
    // check each key of schemaRecord, if array has branch, push trunk to metaRecord.trunk
    const trunkPartial = schemaRelations.reduce((accTrunk, [trunk, leaves]) => {
      if (leaves.includes(branch)) {
        // if old is array, [ ...old, new ]
        // if old is string, [ old, new ]
        // is old is undefined, [ new ]
        const trunks = accTrunk.trunk ? [ accTrunk.trunk, trunk ].flat(Infinity) : trunk;

        return { ...accTrunk, trunk: trunks }
      }

      return accTrunk
    }, {})

    const branchPartial = { _: "branch", branch };

    const metaPartial = metaRecords.find((record) => record.branch === branch) ?? {}

    // if branch has no trunks, it's a trunk
    if (trunkPartial.trunk === undefined) {
      const rootRecord = { ...branchPartial, ...metaPartial }

      return [...accBranch, rootRecord]
    }

    const branchRecord = { ...branchPartial, ...metaPartial, ...trunkPartial }

    return [...accBranch, branchRecord]
  }, [])

  return branchRecords
}

// extract schema record with trunks from branch records
// turn [{ _: branch, branch: "branch2", trunk: "branch1", task: "date" }]
// into [{ _: _, branch1: branch2 }, { _: branch, branch: "branch2", task: "date" }]
export function extractSchemaRecords(branchRecords) {
  const records = branchRecords.reduce(
    (acc, branchRecord) => {
      const { trunk, ...branchRecordOmitted } = branchRecord;

      const accLeaves = acc.schemaRecord[trunk] ?? [];

      const schemaRecord =
        trunk !== undefined
          ? {
              ...acc.schemaRecord,
              [trunk]: [branchRecord.branch, ...accLeaves],
            }
          : acc.schemaRecord;

      const metaRecords = [branchRecordOmitted, ...acc.metaRecords];

      return { schemaRecord, metaRecords };
    },
    { schemaRecord: { _: "_" }, metaRecords: [] },
  );

  return [records.schemaRecord, ...records.metaRecords];
}

/**
 *
 * @name findStrategyShell
 * @export function
 * @param {object} schema -
 * @param {object} query -
 * @param {object} queryMap -
 * @param {object} isQueriedMap -
 * @param {string} base -
 * @returns {object[]} -
 */
export function findStrategyShell(schema, query, queryMap, isQueriedMap, base) {
  // in order of query,
  // first queried twigs
  // then queried trunks
  // then trunk of base
  // then base (either last queried or first unqueried),
  const queriedBranches = Object.keys(isQueriedMap).sort(
    sortNestingAscending(schema),
  );

  const queriedTablets = queriedBranches.map((branch) => ({
    // what branch to set?
    thing: schema[branch].trunk,
    // what branch to match?
    trait: branch,
    // do we set first column?
    thingIsFirst: true,
    // do we match first column?
    traitIsFirst: false,
    filename: `${schema[branch].trunk}-${branch}.csv`,
    regexes: Object.keys(queryMap[`${schema[branch].trunk}-${branch}.csv`])
      .map(
        (trunkRegex) =>
          queryMap[`${schema[branch].trunk}-${branch}.csv`][trunkRegex],
      )
      .flat(),
    hasConstraints: true,
  }));

  const queriedGroups = queriedTablets.reduce(
    (acc, tablet) => {
      const leavesNumber = countLeaves(schema, tablet.trait);

      if (leavesNumber < acc.nestingLevel) {
        throw "unexpected sorting order of branches";
      }

      const nestingLevel =
        leavesNumber === acc.nestingLevel
          ? acc.nestingLevel
          : acc.nestingLevel + 1;

      const rest = acc.groups.slice(0, -1);

      const current = (acc.groups.slice(-1) ?? [])[0] ?? [];

      const groups =
        leavesNumber === acc.nestingLevel
          ? rest.concat([current.concat([tablet])])
          : acc.groups.concat([[tablet]]);

      return { nestingLevel, groups };
    },
    { nestingLevel: 0, groups: [] },
  ).groups;

  const baseHasTrunk = schema[base].trunk !== undefined;

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
    filename: `${schema[base].trunk}-${base}.csv`,
    regexes: [query[base] ?? ""],
  };

  const leaves = Object.keys(schema).filter((b) => schema[b].trunk === base);

  // const isLeafQueried = queriedBranches.some((branch) =>
  //   leaves.includes(branch),
  // );
  // TODO should be empty when queriedBranches has something
  // TODO should be all leaves when queriedBranches is empty
  // const leavesNotQueried = leaves.filter((leaf) => !queriedBranches.includes(leaf))

  const leafTablets = leaves.map((leaf) => ({
    // what branch to set?
    thing: base,
    // what branch to match?
    trait: base,
    // do we set first column?
    thingIsFirst: true,
    // do we match first column?
    traitIsFirst: true,
    filename: `${base}-${leaf}.csv`,
    regexes: [query[base] ?? ""],
    isAppend: true,
  }));

  // const baseGroups = baseHasTrunk ? [[trunkTablet]] : [leafTablets];
  const basePartial = baseHasTrunk ? [[trunkTablet]] : [];

  // if at least one leaf is queried, don't parse other leaves
  // if only datum is queried query all leaves
  // const leafPartial = queriedBranches.length === 0 ? [leafTablets] : [];
  // always query cause we need to gather values
  const leafPartial = queriedBranches.length === 0 ? [leafTablets] : [];

  // TODO account for when there's no query and all leaves are already in leafTablets
  // TODO account for nested crown when leaves of leaves also hold values
  const valueBranches = leaves.filter((leaf) => !queriedBranches.includes(leaf))

  // TODO account for nested crown when trunk is not base
  const valueTablets = valueBranches.map((branch) => ({
    // what branch to set?
    thing: branch,
    // what branch to match?
    trait: base,
    // do we set first column?
    thingIsFirst: false,
    // do we match first column?
    traitIsFirst: true,
    filename: `${base}-${branch}.csv`,
    path: [branch],
    isValue: true,
  }));

  // TODO general implementation for each nesting level

  const valueTablets1 = valueBranches.map((branch) => {
    const branchLeaves = Object.keys(schema).filter((b) => schema[b].trunk === branch);

    return branchLeaves.map((leaf) => ({
      // what branch to set?
      thing: leaf,
      // what branch to match?
      trait: branch,
      // do we set first column?
      thingIsFirst: false,
      // do we match first column?
      traitIsFirst: true,
      filename: `${branch}-${leaf}.csv`,
      path: [branch, leaf],
      isValue: true,
    }))
  }).flat();

  const strategy = [...queriedGroups, ...basePartial, ...leafPartial, valueTablets, valueTablets1];

  // console.log(strategy)

  return strategy;
}

/**
 * This returns an array of records from the dataset.
 * @name
 * @function
 * @param {object} query
 * @returns {Object[]}
 */
export async function shell(schema, cache, query, queryMap, isQueriedMap, base, strategy) {
  const startStream = new stream.Readable({
    objectMode: true,

    read() {
      if (this._toggle) {
        this.push(null);
      } else {
        this._toggle = true;

        this.push({ record: query });
      }

    },
  });

  // user var for acc instead of .reduce
  // because reducer steps need to wait for each other
  // and there's no async reduce until tc39/proposal-async-context
  var accSequential = []
  for (const group of strategy) {
    // const streams = strategy.reduce(
    // each tablet in a group can be parsed in parallel
    // and keyMap partials merged on completion
    // (accSequential, group) => {
    // console.log("group", accSequential, group)

    var accParallel = accSequential;
    for (const stage of group) {
      // const a = group.reduce(
      //   (accParallel, stage) => {
      // console.log("stage", accParallel, stage)

      // TODO replace with file stream
      const lines = cache[stage.filename].split("\n");

      const streamNew = new stream.Transform({
        objectMode: true,

        transform(directive, encoding, callback) {
          // if (stage.filename === "datum-actdate.csv") {
            console.log("transform", directive, stage.filename)
          // }

          var hasMatch = false;

          for (const line of lines) {
            // remove "next" here for checking lists, never pass "next = true" to push
            const { next, ...directiveNew } = core(directive, stage, line);

            directive = directiveNew;

            // push if ready for the next tablet
            // TODO or if no more lines
            if (next) {
              hasMatch = true;
              this.push(directiveNew)
            }
          }

          if (hasMatch === false) {
          // if (hasMatch === false && this._toggle !== true) {
            // console.log("should it be called?", directive, stage)
            this._toggle = true;
            this.push(directive)
          }

          // this.push(null);

          callback();
        },
      });

      accParallel = [ ...accParallel, streamNew ]
      // return [ streamNew, ...accParallel ]
      // },
      // accSequential);
    }

    accSequential = [ ...accParallel ]
  }
  // return [...a, ...accSequential]
  // },
  // [],
  // );
  const streams = accSequential;
  // console.log(strategy, streams.length)

  var records = [];

  const collectStream = new stream.Writable({
    objectMode: true,

    write(directive, encoding, callback) {
      console.log("write", directive);

      records.push(directive.record);

      callback()
    },

    close() {},

    abort(err) {
      console.log("Sink error:", err);
    },
  });

  // console.log([startStream, ...streams, collectStream])

  const pipeline = promisify(stream.pipeline);

  await pipeline([startStream, ...streams, collectStream]);

  return records
}

function getPath(object, path) {
  var index = 0,
      length = path.length;

  while (object != null && index < length) {
    // TODO handle
    object = object[path[index++]];
  }
  return (index && index == length) ? object : undefined;
}

function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

function isIndex(value, length) {
  var type = typeof value,
      MAX_SAFE_INTEGER = 9007199254740991;

  length = length == null ? MAX_SAFE_INTEGER : length;

  var reIsUint = /^(?:0|[1-9]\d*)$/;

  return !!length &&
    (type == 'number' ||
     (type != 'symbol' && reIsUint.test(value))) &&
    (value > -1 && value % 1 == 0 && value < length);
}

function setPath(object, path, value) {
  // console.log("setPath", object, path, value)
  var index = -1,
      length = path.length,
      lastIndex = length - 1,
      nested = object;

  while (nested != null && ++index < length) {
    var key = path[index],
        newValue = value;

    if (index != lastIndex) {
      var objValue = nested[key];

      newValue = isObject(objValue)
        ? objValue
        : (isIndex(path[index + 1]) ? [] : {});
    }

    nested[key] = newValue;

    nested = nested[key];
  }

  return object;
}

/**
 * This returns an array of records from the dataset.
 * @name
 * @function
 * @param {object} query
 * @returns {Object[]}
 */
function core(directive, stage, line) {
  // console.log("core", directive, line)

  // ignore empty newline
  if (line === "") return directive;

  const {
    data: [row],
  } = csv.parse(line);

  const [fst, snd] = row;

  // TODO match constraints
  // if (stage.hasConstraints) {
  //   const failsConstraints =
  //     keyMap[stage.trait] !== undefined &&
  //     !keyMap[stage.trait].includes(stage.traitIsFirst ? fst : snd);

  //   if (failsConstraints) return undefined;
  // }

  if (stage.isValue) {
    // TODO get nested values from record
    // right now tries to get nested at first level,
    // finds either undefined or object and matches all
    // trunk keys from the record
    // const regexes = directive.record[stage.trait];
    const pathTrunk = stage.path.slice(0, -1);

    const valueTrunk = pathTrunk.length > 0
          ? getPath(directive.record, pathTrunk)
          : directive.record;

    const regexes = typeof valueTrunk === "object"
          ? valueTrunk[stage.trait]
          : valueTrunk;

    // match value by key
    const isMatch =
          matchRegexes(
            Array.isArray(regexes) ? regexes : [regexes],
            // TODO replace this with .some()
            [stage.traitIsFirst ? fst : snd],
          ).length > 0;

    if (isMatch) {
      const value = stage.thingIsFirst ? fst : snd;

      // const pathTrunk = stage.path.slice(0, -1);

      // const valueTrunk = getPath(directive.record, pathTrunk)

      if (valueTrunk !== undefined && typeof valueTrunk !== "object") {
        const [trunk] = pathTrunk.slice(-1);

        const objectTrunk = { _: trunk, [trunk]: valueTrunk };

        const recordTrunk = setPath(directive.record, pathTrunk, objectTrunk);

        const recordNew = setPath(recordTrunk, stage.path, value);

        return { record: recordNew, next: true }
      } else {
        const recordNew = setPath(directive.record, stage.path, value);

        return { record: recordNew, next: true }
      }
    } else {
      return { record: directive.record };
    }
  } else {
    // does key match regex?
    const isMatch =
          matchRegexes(
            stage.regexes,
            // TODO replace this with .some()
            [stage.traitIsFirst ? fst : snd],
          ).length > 0;

    if (isMatch) {
      // push to keys
      const value = stage.thingIsFirst ? fst : snd;

      return { record: { ...directive.record, [stage.thing]: value }, next: true }
    } else {
      return { record: directive.record };
    }
  }

  // const record2001 = {
  //   _: 'datum',
  //   datum: 'value1',
  //   filepath: { _: 'filepath', filepath: 'path/to/1', moddate: '2001-01-01'},
  //   saydate: '2001-01-01',
  //   sayname: 'name1',
  //   actdate: '2001-01-01',
  //   actname: 'name1',
  // };

  // return record2001
}
