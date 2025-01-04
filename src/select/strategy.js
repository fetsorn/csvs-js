import {
  findCrown,
  isConnected,
  sortNestingAscending,
  sortNestingDescending,
} from "../schema.js";

function planSelectSchema() {

  return [
    {
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
    }
  ];
}

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

export function planOptions(schema, base) {
  const { trunks } = schema[base];

  // if base is leaf, parse the trunk relationship
  const trunkTablets = trunks.map((trunk) => ({
    // what branch to set?
    thing: base,
    // what branch to match?
    trait: trunk,
    // do we set first column?
    thingIsFirst: false,
    // do we match first column?
    traitIsFirst: false,
    base: trunk,
    filename: `${trunk}-${base}.csv`,
    traitIsRegex: true,
    // should it have constraints?
    eager: true, // push as soon as trait changes in the tablet
    accumulating: true,
  }));

  const { leaves } = schema[base];

  const leafTablets = leaves.map((leaf) => ({
    // what branch to set?
    thing: base,
    // what branch to match?
    trait: base,
    // do we set first column?
    thingIsFirst: true,
    // do we match first column?
    traitIsFirst: true,
    base,
    filename: `${base}-${leaf}.csv`,
    traitIsRegex: true,
    accumulating: true,
    // should it have constraints?
    eager: true, // push as soon as trait changes in the tablet
  }));

  return [...leafTablets, ...trunkTablets];
}

export function planValues(schema, query) {
  const base = query._;

  // should the crown include base?
  const crown = findCrown(schema, base).sort(sortNestingDescending(schema)).filter((b) => b !== base);

  const valueTablets = crown.reduce((withBranch, branch) => {
    const { trunks } = schema[branch];

    const tabletsNew = trunks.map((trunk) => ({
      // what branch to set?
      thing: branch,
      // what branch to match?
      trait: trunk,
      // do we set first column?
      thingIsFirst: false,
      // do we match first column?
      traitIsFirst: true,
      base: trunk,
      filename: `${trunk}-${branch}.csv`,
      passthrough: true,
      eager: trunk === base, // push as soon as trait changes in the tablet
    }))

    return [...withBranch, ...tabletsNew];
  }, []);

  return valueTablets;
}

export function planSelect(schema, query) {
  const base = query._;

  const isSchema = base === "_";

  if (isSchema) return planSelectSchema();

  const queryStrategy = planQuery(schema, query);

  const baseStrategy =
    queryStrategy.length > 0 ? queryStrategy : planOptions(schema, base);

  const valueStrategy = planValues(schema, query);

  const strategy = [...baseStrategy, ...valueStrategy];

  return strategy;
}
