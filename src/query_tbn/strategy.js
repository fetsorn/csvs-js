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

  return leaves.reduce((keys, key) => {
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
}

export function planQuery(schema, query) {
  // queried keys in ascending order minus the base
  const queriedBranches = gatherKeys(query).sort(sortNestingAscending(schema));

  // TODO rewrite to using schema record
  const queriedTablets = queriedBranches.reduce((withBranch, branch) => {
    const { trunks } = schema[branch];

    const tabletsNew = trunks.map((trunk) => ({
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

    return [...withBranch, ...tabletsNew]
  }, []);

  return queriedTablets;
}
