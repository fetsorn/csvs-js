import { findCrown } from "../schema.js";

export function planInsert(schema, query) {
  const base = query._;

  // TODO schema strategy

  const crown = findCrown(schema, base);

  const tablets = crown.reduce((withBranch, branch) => {
    const { trunk } = schema[branch];

    const tabletsNew = trunk.map((t) => ({
      filename: `${trunk}-${branch}.csv`,
      trunk: t,
      branch,
    }))

    return [...withBranch, tabletsNew].flat()
  }, []);
  console.log(tablets)

  return tablets;
}
