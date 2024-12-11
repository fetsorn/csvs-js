import { findCrown } from "../schema.js";

export function planUpdate(schema, query) {
  const base = query._;

  const isSchema = base === "_";

  if (isSchema)
    return [
      {
        filename: `_-_.csv`,
      },
    ];

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
