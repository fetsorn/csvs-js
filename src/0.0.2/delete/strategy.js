export function planPrune(schema, record) {
  // TODO: handle weird case when value is array
  // { _: a, a: [ { _: a, a: a1 }, { _: a, a: a1 } ] }
  const { _: base, [base]: baseValue } = record;

  const { trunk } = schema[base];

  const trunkTablet = {
    filename: `${trunk}-${base}.csv`,
    trait: baseValue,
    traitIsFirst: false,
  };

  const trunkPartial = trunk !== undefined ? [trunkTablet] : [];

  const leaves = Object.keys(schema).filter(
    (branch) => schema[branch].trunk === base,
  );

  const leafTablets = leaves.map((leaf) => ({
    filename: `${base}-${leaf}.csv`,
    trait: baseValue,
    traitIsFirst: true,
  }));

  return [...trunkPartial, ...leafTablets];
}
