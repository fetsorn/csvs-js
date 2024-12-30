import { findCrown } from "../schema.js";

export function planInsert(schema, query) {
  const base = query._;

  // TODO schema strategy

  const crown = findCrown(schema, base);

  const tablets = crown.map((branch) => {
    const { trunk } = schema[branch];

    return {
      filename: `${trunk}-${branch}.csv`,
      trunk,
      branch,
    };
  });

  return tablets;
}
