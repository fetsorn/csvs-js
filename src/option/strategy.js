export function planOptions(schema, base) {
  const { trunks } = schema[base];

  // if base is leaf, parse the trunk relationship
  const trunkTablets = trunks.map((trunk) => ({
    // what branch to set?
    thing: base,
    // what branch to match?
    trait: base,
    // do we set first column?
    thingIsFirst: false,
    // do we match first column?
    traitIsFirst: false,
    base,
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

export function planSelect(schema, query) {
  const base = query._;

  const baseStrategy = planOptions(schema, base);

  const strategy = [...baseStrategy];

  return strategy;
}
