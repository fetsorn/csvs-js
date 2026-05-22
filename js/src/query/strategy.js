import { isConnected, sortNestingAscending } from "../schema.js";

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

  return bar;
}

/// For a branch with multiple trunks, find the single trunk that connects
/// this branch to the query base along the shortest path in the schema graph.
/// Falls back to the first connected trunk if no direct match.
function findTrunkForBase(schema, base, branch) {
  if (schema[branch] === undefined) return undefined;

  const { trunks } = schema[branch];

  // Prefer direct: trunk == base
  if (trunks.includes(base)) return base;

  // Otherwise pick the first trunk connected to base
  return trunks.find((trunk) => isConnected(schema, base, trunk));
}

export function planQuery(schema, query) {
  // queried keys in ascending order minus the base
  const queriedBranches = gatherKeys(query).sort(sortNestingAscending(schema));

  const queriedTablets = queriedBranches.reduce((withBranch, branch) => {
    const trunk = findTrunkForBase(schema, query._, branch);

    if (trunk === undefined) return withBranch;

    const tablet = {
      thing: trunk,
      trait: branch,
      thingIsFirst: true,
      traitIsFirst: false,
      base: trunk,
      filename: `${trunk}-${branch}.csv`,
      traitIsRegex: true,
      querying: true,
      eager: true,
    };

    return [...withBranch, tablet];
  }, []);

  return queriedTablets;
}
