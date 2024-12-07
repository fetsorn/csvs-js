import {
  findCrown,
} from "../schema.js";

export function planUpdateSchema(schema, query) {
  const schemaTablet = {
    filename: `_-_.csv`
  };

  return [schemaTablet]
}

export function planUpdate(schema, query) {
  const base = query._;

  const crown = findCrown(schema, base);

  const tablets = crown.map((branch) => {
    const { trunk } = schema[branch];

    return {
      filename: `${trunk}-${branch}.csv`,
      trunk,
      branch
    }
  })

  return tablets
}
