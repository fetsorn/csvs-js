import { findCrown, sortNestingDescending } from "../schema.js";

export function planBuild(schema, query) {
  const base = query._;

  // should the crown include base?
  const crown = findCrown(schema, base)
    .sort(sortNestingDescending(schema))
    .filter((b) => b !== base);

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
      eager: trunk === base, // push as soon as trait changes in the tablet
    }));

    return [...withBranch, ...tabletsNew];
  }, []);

  return valueTablets;
}
