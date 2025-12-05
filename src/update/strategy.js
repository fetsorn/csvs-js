import { findCrown } from "../schema.js";

function planUpdateSchema() {
  return [
    {
      filename: `_-_.csv`,
    }
  ]
}

export function planUpdate(schema, query) {
  const base = query._;

  const isSchema = base === "_";

  if (isSchema) return planUpdateSchema();

  const crown = findCrown(schema, base);

  const tablets = crown.reduce((withBranch, branch) => {
    const { trunks } = schema[branch];

    const tabletsNew = trunks.map((trunk) => ({
      filename: `${trunk}-${branch}.csv`,
      trunk,
      branch,
    }))

    return [...withBranch, tabletsNew].flat()
  }, []);

  return tablets;
}
