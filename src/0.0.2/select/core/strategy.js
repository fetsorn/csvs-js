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
export function planStrategy(schema, queryMap, isQueriedMap, query, base) {
  // TODO rewrite to just using query
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
    // TODO rewrite to just using query
    regexes: Object.keys(queryMap[`${schema[branch].trunk}-${branch}.csv`])
      .map(
        (trunkRegex) =>
          queryMap[`${schema[branch].trunk}-${branch}.csv`][trunkRegex],
      )
      .flat(),
    hasConstraints: true,
    traitIsRegex: true,
    querying: true,
    eager: true, // push as soon as trait changes in the tablet
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
    regexes: [query[base] ?? ""],
    isAppend: true,
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
    isValue: true,
    hasConstraints: true,
    isAppend: true,
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
        isValue: true,
        isAppend: true,
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
          isValue: true,
          isAppend: true,
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
