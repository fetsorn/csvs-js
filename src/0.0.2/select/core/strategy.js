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

// in order of query,
// first queried twigs
// then queried trunks
// then trunk of base
// then base (either last queried or first unqueried),
function gatherKeys(object) {
  // skip base
  const keys = Object.keys(object).filter(
    (key) => key !== "_" && key !== object._,
  );

  return keys.reduce((acc, key) => {
    const value = object[key];
    // if array go down each item
    if (Array.isArray(value)) {
      const nestedKeys = value.reduce((accItem, item) => {
        // assume item is not a list
        const isObject = typeof item === "object";

        const keysObject = isObject ? gatherKeys(object) : [];

        return [...keysObject, ...accItem];
      }, []);

      return [...nestedKeys, key, ...acc];
    }

    // assume value is not a list
    const isObject = typeof value === "object";

    // if object gather nested keys
    const keysObject = isObject ? gatherKeys(value) : [];

    return [...keysObject, key, ...acc];
  }, []);
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
export function planStrategy(schema, query) {
  const base = query._;

  // queried keys in ascending order minus the base
  const queriedBranches = gatherKeys(query);

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

  // TODO after this step if queried is a deeply nested branch, it must be parsed again
  // to find siblings

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
    traitIsRegex: true,
    // should it have constraints?
    querying: true,
    eager: true, // push as soon as trait changes in the tablet
  };

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

  // const baseGroups = baseHasTrunk ? [[trunkTablet]] : [leafTablets];
  const basePartial = baseHasTrunk ? [[trunkTablet]] : [];

  // if at least one leaf is queried, don't parse other leaves
  // if only datum is queried query all leaves
  const leafPartial = queriedBranches.length === 0 ? [leafTablets] : [];

  // TODO account for when there's no query and all leaves are already in leafTablets
  // TODO account for nested crown when leaves of leaves also hold values
  const valueBranches = leaves.filter(
    (leaf) => !queriedBranches.includes(leaf),
  );

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
    passthrough: true,
    eager: true, // push as soon as trait changes in the tablet
  }));

  // TODO general implementation for each nesting level
  const valueTablets1 = valueBranches
    .map((branch) => {
      const branchLeaves = Object.keys(schema).filter(
        (b) => schema[b].trunk === branch,
      );

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
        passthrough: true,
      }));
    })
    .flat();

  const valueTablets2 = valueBranches
    .map((branch) => {
      const branchLeaves1 = Object.keys(schema).filter(
        (b) => schema[b].trunk === branch,
      );
      return branchLeaves1.map((leaf1) => {
        const branchLeaves2 = Object.keys(schema).filter(
          (b) => schema[b].trunk === leaf1,
        );
        return branchLeaves2.map((leaf2) => ({
          // what branch to set?
          thing: leaf2,
          // what branch to match?
          trait: leaf1,
          // do we set first column?
          thingIsFirst: false,
          // do we match first column?
          traitIsFirst: true,
          filename: `${leaf1}-${leaf2}.csv`,
          passthrough: true,
        }));
      });
    })
    .flat(Infinity);

  const strategy = [
    ...queriedGroups,
    ...basePartial,
    ...leafPartial,
    valueTablets,
    valueTablets1,
    valueTablets2,
  ];

  return strategy;
}
