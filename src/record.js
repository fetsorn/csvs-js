// TODO what if trait-thing relation appears elsewhere deeper in the record?
function mowBaseIsThing(record, trait, thing) {
  const { _: base } = record;

  // assume base is single value
  const basePartial =
    record[base] === undefined ? {} : { [base]: record[base] };

  // take values
  const branchItems = Array.isArray(record[trait])
    ? record[trait]
    : [record[trait]].filter((item) => item !== undefined);

  // this is needed to add things to grains without thing with sow
  if (branchItems.length === 0) return [{ _: base, ...basePartial }];

  const grains = branchItems
    .map((branchItem) => {
      const isObject = typeof branchItem === "object";

      const branchValue = isObject ? branchItem[trait] : branchItem;

      if (branchValue === undefined) return undefined;

      return { _: base, ...basePartial, [trait]: branchValue };
    })
    .filter((grain) => grain !== undefined);

  return grains;
}

// TODO what if trait-thing relation appears elsewhere deeper in the record?
function mowBaseIsTrait(record, trait, thing) {
  const { _: base } = record;

  // assume base is single value
  const basePartial =
    record[base] === undefined ? {} : { [base]: record[base] };

  // take values
  const branchItems = Array.isArray(record[thing])
    ? record[thing]
    : [record[thing]].filter((item) => item !== undefined);

  // this is needed to add things to grains without thing with sow
  if (branchItems.length === 0) return [{ _: trait, [trait]: record[trait] }];

  const grains = branchItems
    .map((branchItem) => {
      const isObject = typeof branchItem === "object";

      const branchValue = isObject ? branchItem[thing] : branchItem;

      if (branchValue === undefined) return undefined;

      return { _: base, ...basePartial, [thing]: branchValue };
    })
    .filter((grain) => grain !== undefined);

  return grains;
}

// TODO what if trait-thing relation appears elsewhere deeper in the record?
function mowTraitIsObject(record, trait, thing) {
  // TODO what if trunk is undefined here?
  const { [trait]: omitted, ...recordWithoutTrunk } = record;

  const trunkItems = Array.isArray(omitted) ? omitted : [omitted];

  const grains = trunkItems.reduce((withTrunkItem, trunkItem) => {
    const isObject = typeof trunkItem === "object";

    const trunkObject = isObject ? trunkItem : { _: trait, [trait]: trunkItem };

    const trunkValue = isObject ? trunkItem[trait] : trunkItem;

    const branchItems = Array.isArray(trunkObject[thing])
      ? trunkObject[thing]
      : [trunkObject[thing]];

    const trunkItemGrains = branchItems.map((branchItem) => {
      const branchItemIsObject = typeof branchItem === "object";

      const branchValue = branchItemIsObject ? branchItem[thing] : branchItem;

      // this is needed to add things to grains without thing with sow
      if (branchValue === undefined) return { _: trait, [trait]: trunkValue };

      const grain = { _: trait, [trait]: trunkValue, [thing]: branchValue };

      return grain;
    });

    return [...withTrunkItem, ...trunkItemGrains];
  }, []);

  return grains;
}

function mowTraitIsNested(record, trait, thing) {
  const { _: base, [base]: baseValueOmitted, ...recordWithoutBase } = record;

  // TODO can we guess here which of the remaining leaves leads to the.trait?
  const entries = Object.entries(recordWithoutBase);

  // reduce each key-value pair to match trait and set thing
  const grains = entries.reduce((withEntry, [leaf, leafValue]) => {
    // TODO should we take from omitted or leafValue here?
    const leafItems = Array.isArray(leafValue) ? leafValue : [leafValue];

    const grainsLeaf = leafItems.reduce((withLeafItem, leafItem) => {
      const isObject = !Array.isArray(leafItem) && typeof leafItem === "object";

      const leafObject = isObject ? leafItem : { _: leaf, [leaf]: leafItem };

      const grainsLeafItem = mow(leafObject, trait, thing);

      return [...withLeafItem, ...grainsLeafItem];
    }, []);

    return [...withEntry, ...grainsLeaf];
  }, []);

  return grains;
}

export function mow(record, trait, thing) {
  const { _: base } = record;

  const baseIsThing = base === thing;

  if (baseIsThing) return mowBaseIsThing(record, trait, thing);

  const baseIsTrait = base === trait;

  if (baseIsTrait) return mowBaseIsTrait(record, trait, thing);

  const recordHasTrait = Object.hasOwn(record, trait);

  if (recordHasTrait) return mowTraitIsObject(record, trait, thing);

  // if none of the fields are trait or thing, go into objects
  return mowTraitIsNested(record, trait, thing);
}

function sowBaseIsThing(record, grain, trait, thing) {
  // what if grain does not have thing?
  if (grain[thing] === undefined) return record;

    // if record already has a base value, set it from grain
    if (record[thing] !== undefined) return { ...record, [thing]: record[thing] };

  const existingPartial =
    record[thing] === undefined ? [] : [record[thing]].flat();

  const thingValue = [...existingPartial, grain[thing]];

  const recordNew = {
    ...record,
    [thing]: thingValue.length === 1 ? thingValue[0] : thingValue,
  };

  return recordNew;
}

function sowBaseIsTrait(record, grain, trait, thing) {
  const existingPartial =
    record[thing] === undefined ? [] : [record[thing]].flat();

  // what if grain does not have thing?
  if (grain[thing] === undefined) return record;

  const thingValue = [...existingPartial, grain[thing]];

  const recordNew = {
    ...record,
    [thing]: thingValue.length === 1 ? thingValue[0] : thingValue,
  };

  return recordNew;
}

function sowTraitIsObject(record, grain, trait, thing) {
  const trunkItems = Array.isArray(record[trait])
    ? record[trait]
    : [record[trait]];

  const traitItems = trunkItems.map((trunkItem) => {
    const isObject = !Array.isArray(trunkItem) && typeof trunkItem === "object";

    const trunkValue = isObject ? trunkItem[trait] : trunkItem;

    const trunkObject = isObject ? trunkItem : { _: trait, [trait]: trunkItem };

    const existingLeafValue = trunkObject[thing];

    const leafValues =
      existingLeafValue === undefined
        ? grain[thing]
        : [existingLeafValue, grain[thing]].flat();

    const isMatch = trunkValue === grain[trait];

    const trunkItemNew = isMatch
      ? { ...trunkObject, [thing]: leafValues }
      : trunkItem;

    // append if another trunk value already exists
    // const existingTrunkValue = recordWithTrunk[trunk];
    //
    // const trunkValues =
    //       existingTrunkValue === undefined
    //       ? trunkItemNew
    //       : [existingTrunkValue, trunkItemNew].flat();
    return trunkItemNew;
  });

  const recordNew = {
    ...record,
    [trait]: traitItems.length === 1 ? traitItems[0] : traitItems,
  };

  return recordNew;
}

function sowTraitIsNested(record, grain, trait, thing) {
  const { _: base, [base]: baseValueOmitted, ...recordWithoutBase } = record;

  const entries = Object.entries(recordWithoutBase);

  const entriesNew = entries.map(([leaf, leafValue]) => {
    const leafItems = Array.isArray(leafValue) ? leafValue : [leafValue];

    const leafItemsNew = leafItems.map((leafItem) => {
      const isObject = !Array.isArray(leafItem) && typeof leafItem === "object";

      const leafObject = isObject ? leafItem : { _: leaf, [leaf]: leafItem };

      const leafItemNew = isObject
        ? sow(leafObject, grain, trait, thing)
        : leafItem;

      return leafItemNew;
    });

    const leafValueNew =
      leafItemsNew.length === 1 ? leafItemsNew[0] : leafItemsNew;

    return [leaf, leafValueNew];
  });

  const baseValuePartial =
    baseValueOmitted === undefined ? {} : { [base]: baseValueOmitted };

  const recordNew = {
    _: base,
    ...baseValuePartial,
    ...Object.fromEntries(entriesNew),
  };

  return recordNew;
}

export function sow(record, grain, trait, thing) {
  const { _: base } = record;

  const baseIsThing = base === thing;

  if (baseIsThing) return sowBaseIsThing(record, grain, trait, thing);

  const baseIsTrait = base === trait;

  if (baseIsTrait) return sowBaseIsTrait(record, grain, trait, thing);

  const recordHasTrait = Object.hasOwn(record, trait);

  if (recordHasTrait) return sowTraitIsObject(record, grain, trait, thing);

  // if none of the fields are trait or thing, go into objects
  return sowTraitIsNested(record, grain, trait, thing);
}
