import {
  findCrown,
  isConnected,
  sortNestingAscending,
  sortNestingDescending,
} from "../schema.js";

// in order of query,
// first queried twigs
// then queried trunks
// then trunk of base
// then base (either last queried or first unqueried),
function gatherKeys(record) {
  // skip base
  const leaves = Object.keys(record).filter(
    (key) => key !== "_" && key !== "__" && key !== record._,
  );

  const bar = leaves.reduce((keys, key) => {
    const { [key]: leafValue } = record;

    const leafValues = Array.isArray(leafValue) ? leafValue : [leafValue];

    // if array go down each item
    const keysLeaf = leafValues.reduce((keysItem, item) => {
      // assume item is not a list
      const isObject = typeof item === "object";

      const keysItemNew = isObject ? gatherKeys(item) : [];

      return [...keysItem, ...keysItemNew];
    }, []);

    return [...keys, key, ...keysLeaf];
  }, []);

  if (record[record._] !== undefined) {
    return [...bar, record._];
  }

  return bar;
}

export function planQuery(schema, query) {
  // queried keys in ascending order minus the base
  const queriedBranches = gatherKeys(query).sort(sortNestingAscending(schema));

  const queriedTablets = queriedBranches.reduce((withBranch, branch) => {
    const { trunks } = schema[branch];

    const trunkTablets = trunks.map((trunk) => ({
      // what branch to set?
      thing: trunk,
      // what branch to match?
      trait: branch,
      // do we set first column?
      thingIsFirst: true,
      // do we match first column?
      traitIsFirst: false,
      base: trunk,
      filename: `${trunk}-${branch}.csv`,
      traitIsRegex: true,
      querying: true,
      eager: true, // push as soon as trait changes in the tablet
    }));

    const { leaves } = schema[branch];

    const leafTablets = leaves.map((leaf) => ({
      // what branch to set?
      thing: branch,
      // what branch to match?
      trait: branch,
      // do we set first column?
      thingIsFirst: true,
      // do we match first column?
      traitIsFirst: true,
      base: branch,
      filename: `${branch}-${leaf}.csv`,
      traitIsRegex: true,
      querying: true,
      // should it have constraints?
      eager: true, // push as soon as trait changes in the tablet
    }));

    return [...withBranch, ...trunkTablets, ...leafTablets];
  }, []);

  return queriedTablets;
}

export function planSelect(schema, query) {
  return planQuery(schema, query);
}
