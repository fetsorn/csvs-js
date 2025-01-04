export function planPrune(schema, record) {
  // TODO schema strategy

  // TODO: handle case when value is array
  // { _: a, a: [ { _: a, a: a1 }, { _: a, a: a1 } ] }
  const { _: base, [base]: baseValue } = record;

  const trunks = schema[base].trunk;

  const trunkTablets = trunks.map((trunk) => {
    return {
      filename: `${trunk}-${base}.csv`,
      trait: baseValue,
      traitIsFirst: false,
    }
  });

  const { leaves } = schema[base];

  const leafTablets = leaves.map((leaf) => ({
    filename: `${base}-${leaf}.csv`,
    trait: baseValue,
    traitIsFirst: true,
  }));

  return [...trunkTablets, ...leafTablets];
}
