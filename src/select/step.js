// function s(value) {
//   return JSON.stringify(value, undefined, 2);
// }

// function log(name, tablet, state, trait, thing, key, item) {
//   if (tablet.filename === "export1_tag-export1_channel.csv")
//     console.log(
//       name,
//       tablet.filename,
//       state ? state.record._ : undefined,
//       "\n",
//       s(trait),
//       s(thing),
//       "\n",
//       s(key),
//       s(item),
//       "\n",
//       s(state.record),
//     );
// }

function schemaCase(tablet, record, trait, thing) {
  // append thing to trait
  const existingLeaf = record[trait];

  const leaves =
    existingLeaf === undefined ? [thing] : [existingLeaf, thing].flat();

  return { isMatch: true, record: { ...record, [trait]: leaves } };
}

// assume that base value is not a list or an object
function baseIsRegexCase(tablet, record, trait, thing) {
  // base is both trait and thing
  const { _: base, [base]: baseValue } = record;

  const isMatch = tablet.traitIsRegex
    ? new RegExp(baseValue).test(trait)
    : baseValue === trait;

  // if match replace base value with thing
  const basePartial = isMatch ? { [base]: thing } : {};

  // if match update leaf values
  const state = {
    isMatch,
    record: { ...record, ...basePartial },
  };

  // if (isMatch) {
  //   log("base regex match", tablet, state, trait, thing, base, baseValue);
  // } else {
  //   log("base regex no match", tablet, state, trait, thing, base, baseValue);
  // }

  return state;
}

function traitIsLeafCase(tablet, record, trait, thing) {
  // log("leaf", tablet, { record }, trait, thing);

  const { trait: leaf, thing: base } = tablet;

  // TODO what if traitValue is undefined here?
  const { [leaf]: omitted, ...recordWithoutLeaf } = record;

  let leafItems = Array.isArray(omitted) ? omitted : [omitted];

  // if record has a trait leaf and thing base, match it to trait to set base
  const stateValues = leafItems.reduce(
    (stateWithLeaf, leafItem) => {
      const { isMatch: isMatchItem, record: recordWithLeaf } = stateWithLeaf;

      const isObject = !Array.isArray(leafItem) && typeof leafItem === "object";

      const leafValue = isObject ? leafItem[leaf] : leafItem;

      const isMatch = tablet.traitIsRegex
        ? new RegExp(leafValue).test(trait)
        : leafValue === trait;

      // append leafItem to leaf if recordWithLeaf
      const existingLeaf = recordWithLeaf[leaf];

      // drop regex leafValue and replace with literal trait value
      // if object preserve an object leaves from leafItem
      const thisLeaf = isObject ? { ...leafItem, [leaf]: trait } : trait;

      const leafValues =
        existingLeaf === undefined ? thisLeaf : [existingLeaf, thisLeaf].flat();

      const leafPartial = { [leaf]: leafValues };

      const existingBase = recordWithLeaf[base];

      // if a different leaf already found a base value, make sure it matches
      const passesFilter = existingBase === undefined || existingBase === thing;

      const baseIsNew = isMatch && passesFilter;

      const basePartial = baseIsNew ? { [base]: thing } : {};

      // if match set base to thing
      const state = {
        isMatch: isMatchItem ? isMatchItem : baseIsNew,
        record: { ...recordWithLeaf, ...leafPartial, ...basePartial },
      };

      // if (isMatch) {
      //   log("leaf match", tablet, state, trait, thing, leaf, leafValue);
      // } else {
      //   log("leaf no match", tablet, state, trait, thing, leaf, leafValue);
      // }

      return state;
    },
    { record: recordWithoutLeaf },
  );

  // log("leaf end", tablet, stateValues, trait, thing, leaf, leafItems);

  return stateValues;
}

function traitIsTrunkCase(tablet, record, trait, thing) {
  // log("trunk", tablet, { record }, trait, thing);

  // TODO what if it's an object?
  // const { _: base, [trait]: leafValue } = record;
  const { _: base } = record;

  // const isMatch = tablet.traitIsRegex
  //   ? new RegExp(leafValue).test(trait)
  //   : leafValue === trait;

  const state = { isMatch: true, record: { ...record, [base]: thing } };

  // log("trunk match", tablet, state, trait, thing, base);

  return state;
}

function baseIsThingCase(tablet, record, trait, thing) {
  const { _: base, [base]: baseValue } = record;

  const baseIsRegex = base === tablet.trait && baseValue !== undefined;

  if (base === "_") return schemaCase(tablet, record, trait, thing);

  if (baseIsRegex) return baseIsRegexCase(tablet, record, trait, thing);

  const recordHasTrait = Object.hasOwn(record, tablet.trait);

  const traitIsLeaf = recordHasTrait;

  // TODO this should fail and not pass through if record has no trait

  // if trait is leaf of base
  if (traitIsLeaf) return traitIsLeafCase(tablet, record, trait, thing);

  // if trait is trunk of base
  const traitIsTrunk = !recordHasTrait;

  if (traitIsTrunk) return traitIsTrunkCase(tablet, record, trait, thing);

  // TODO unreachable? throw error?
}

// assume that base value is not a list or an object
function traitIsBaseCase(tablet, record, trait, thing) {
  const { trait: base, thing: leaf } = tablet;

  const { [base]: baseValue } = record;

  const isMatch = tablet.traitIsRegex
    ? new RegExp(baseValue).test(trait)
    : baseValue === trait;

  const existingValue = record[leaf];

  // append if another value already exists
  const leafValues =
    existingValue === undefined ? thing : [existingValue, thing].flat();

  const leafPartial = isMatch ? { [leaf]: leafValues } : {};

  // if match update leaf values
  const state = {
    isMatch,
    record: { ...record, ...leafPartial },
  };

  // if (isMatch) {
  //   log("base match", tablet, state, trait, thing, base, baseValue);
  // } else {
  //   log("base no match", tablet, state, trait, thing, base, baseValue);
  // }

  return state;
}

function baseIsTraitCase(tablet, record, trait, thing) {
  // && baseValue !== undefined

  // if base is trait for a leaf
  return traitIsBaseCase(tablet, record, trait, thing);

  // what if baseValue undefined?

  // TODO unreachable? throw error?
}

function traitIsObjectCase(tablet, record, trait, thing) {
  // log("object", tablet, { record }, trait, thing);

  const { trait: trunk, thing: leaf } = tablet;

  // TODO what if trunk is undefined here?
  const { [trunk]: omitted, ...recordWithoutTrunk } = record;

  let trunkItems = Array.isArray(omitted) ? omitted : [omitted];

  const stateValues = trunkItems.reduce(
    (stateWithTrunk, trunkItem) => {
      const { isMatch: isMatchItem, record: recordWithTrunk } = stateWithTrunk;

      const isObject =
        !Array.isArray(trunkItem) && typeof trunkItem === "object";

      const trunkObject = isObject
        ? trunkItem
        : { _: trunk, [trunk]: trunkItem };

      const trunkValue = isObject ? trunkItem[trunk] : trunkItem;

      const isMatch = tablet.traitIsRegex
        ? new RegExp(trunkValue).test(trait)
        : trunkValue === trait;

      const existingLeafValue = trunkObject[leaf];

      // append if another leaf value already exists
      const leafValues =
        existingLeafValue === undefined
          ? thing
          : [existingLeafValue, thing].flat();

      // if match update leaf values in new trunk item
      const trunkItemNew = isMatch
        ? { ...trunkObject, [leaf]: leafValues }
        : trunkItem;

      // append if another trunk value already exists
      const existingTrunkValue = recordWithTrunk[trunk];

      const trunkValues =
        existingTrunkValue === undefined
          ? trunkItemNew
          : [existingTrunkValue, trunkItemNew].flat();

      // TODO what if trunkValues is empty here?
      const state = {
        isMatch: isMatchItem ? isMatchItem : isMatch,
        record: { ...recordWithTrunk, [trunk]: trunkValues },
      };

      // if (isMatch) {
      //   log("object match", tablet, state, trait, thing, trunk, trunkValue);
      // } else {
      //   log("object no match", tablet, state, trait, thing, trunk, trunkValue);
      // }

      return state;
    },
    { record: recordWithoutTrunk },
  );

  // log("object end", tablet, stateValues, trait, thing, trunk, trunkItems);

  return stateValues;
}

// walk down the rest of the leaves to find the trait-thing pair
function traitIsNestedCase(tablet, record, trait, thing) {
  // log("nested", tablet, { record }, trait, thing);

  const { _: base, [base]: baseValueOmitted, ...recordWithoutBase } = record;

  // TODO can we guess here which of the remaining leaves leads to the tablet.trait?
  const entries = Object.entries(recordWithoutBase);

  // reduce each key-value pair to match trait and set thing
  const stateEntries = entries.reduce(
    (stateWithEntry, [leaf, leafValue]) => {
      // log("entry", tablet, stateWithEntry, trait, thing, leaf, leafValue);

      // remember is previous entry already matched
      const { isMatch: isMatchEntry, record: recordWithEntry } = stateWithEntry;

      // if previous entry matched none of the rest can, return as is
      if (isMatchEntry) return stateWithEntry;

      // remove values of given key to rewrite later
      // TODO describe difference between omitted and leafValue
      const { [leaf]: omitted, ...recordWithoutLeaf } = recordWithEntry;

      // TODO should we take from omitted or leafValue here?
      let leafItems = Array.isArray(leafValue) ? leafValue : [leafValue];

      // reduce each value item to match trait and set thing
      const stateValues = leafItems.reduce(
        (stateWithLeaf, leafItem) => {
          // remember if previous item already matched
          const { isMatch: isMatchItem, record: recordWithLeaf } =
            stateWithLeaf;

          const isObject =
            !Array.isArray(leafItem) && typeof leafItem === "object";

          const leafObject = isObject
            ? leafItem
            : { _: leaf, [leaf]: leafItem };

          // if object, call choose to get isMatch and new item
          // if not object, set isMatch to false and new item to leafItem
          const { isMatch, record: leafItemNew } = step(
            tablet,
            leafObject,
            trait,
            thing,
          );

          const leafValue = isMatch ? leafItemNew : leafItem;

          const existingValue = recordWithLeaf[leaf];

          const leafValues =
            existingValue === undefined
              ? leafValue
              : [existingValue, leafValue].flat();

          // update leaf field
          const state = {
            isMatch: isMatchItem ? isMatchItem : isMatch,
            record: { ...recordWithLeaf, [leaf]: leafValues },
          };

          // if (isMatch) {
          //   log("nested match", tablet, state, trait, thing, leaf, leafItem);
          // } else {
          //   log("nested no match", tablet, state, trait, thing, leaf, leafItem);
          // }

          return state;
        },
        { record: recordWithoutLeaf },
      );

      // TODO can values length be 0?
      // [leaf]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,

      // log("entry end", tablet, stateValues, trait, thing, leaf);

      return stateValues;
    },
    { record: recordWithoutBase },
  );

  // put base back in
  const stateWithBase = {
    isMatch: stateEntries.isMatch,
    record: { ...stateEntries.record, _: base, [base]: baseValueOmitted },
  };

  // log("nested end", tablet, stateWithBase, trait, thing);

  return stateWithBase;
}

export function step(tablet, record, trait, thing) {
  const { _: base } = record;

  const baseIsThing = base === tablet.thing;

  if (baseIsThing) return baseIsThingCase(tablet, record, trait, thing);

  const baseIsTrait = base === tablet.trait;

  if (baseIsTrait) return baseIsTraitCase(tablet, record, trait, thing);

  const recordHasTrait = Object.hasOwn(record, tablet.trait);

  if (recordHasTrait) return traitIsObjectCase(tablet, record, trait, thing);

  // if none of the fields are trait or thing, go into objects
  return traitIsNestedCase(tablet, record, trait, thing);
}
