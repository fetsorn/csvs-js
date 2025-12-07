import { findCrown } from "../schema.js";

export function planInsert(schema, query) {
  const base = query._;

  const crown = findCrown(schema, base);

  const tablets = crown.reduce((withBranch, branch) => {
    const { trunks } = schema[branch];

    const tabletsNew = trunks.map((trunk) => ({
      filename: `${trunk}-${branch}.csv`,
      trunk,
      branch,
    }));

    return [...withBranch, tabletsNew].flat();
  }, []);

  return tablets;
}
