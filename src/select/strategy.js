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
    traitIsRegex: true,
    querying: true,
    eager: true, // push as soon as trait changes in the tablet
  }));

  return queriedTablets;
}

export function planOptions(schema, base) {
  const trunk = schema[base] !== undefined ? schema[base].trunk : undefined;

  const baseHasTrunk = trunk !== undefined;

  // if base is leaf, parse the trunk relationship
  const trunkTablet = {
    // what branch to set?
    thing: base,
    // what branch to match?
    trait: trunk,
    // do we set first column?
    thingIsFirst: false,
    // do we match first column?
    traitIsFirst: false,
    filename: `${trunk}-${base}.csv`,
    traitIsRegex: true,
    // should it have constraints?
    eager: true, // push as soon as trait changes in the tablet
    accumulating: true,
  };

  // const baseGroups = baseHasTrunk ? [[trunkTablet]] : [leafTablets];
  const basePartial = baseHasTrunk ? [trunkTablet] : [];

  const leaves = Object.keys(schema).filter((b) => schema[b].trunk === base);

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
    traitIsRegex: true,
    accumulating: true,
    // should it have constraints?
    eager: true, // push as soon as trait changes in the tablet
  }));

  return [...leafTablets, ...basePartial];
}

export function planValues(schema, query) {
  const base = query._;

  const crown = findCrown(schema, base).sort(sortNestingDescending(schema));

  const valueTablets = crown.map((branch) => {
    const trunkList = [schema[branch].trunk].flat();

    // TODO what if more than one trunk is connected to base?
    const trunk = trunkList.find((trunk) => isConnected(schema, base, trunk));

    return {
      // what branch to set?
      thing: branch,
      // what branch to match?
      trait: trunk,
      // do we set first column?
      thingIsFirst: false,
      // do we match first column?
      traitIsFirst: true,
      filename: `${trunk}-${branch}.csv`,
      passthrough: true,
      eager: trunk === base, // push as soon as trait changes in the tablet
    };
  });

  return valueTablets;
}

export function planSchema() {
  const schemaTablet = {
    // what branch to set?
    thing: "_",
    // what branch to match?
    trait: "_",
    // do we set first column?
    thingIsFirst: false,
    // do we match first column?
    traitIsFirst: true,
    filename: `_-_.csv`,
    // should it have constraints?
  };

  return [schemaTablet];
}
