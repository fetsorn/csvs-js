function log(name, tablet, state, trait, thing, key, item) {
  console.log(
    name,
    tablet.filename,
    state.current._,
    "\n",
    JSON.stringify(trait, undefined, 2),
    JSON.stringify(thing, undefined, 2),
    "\n",
    JSON.stringify(key, undefined, 2),
    JSON.stringify(item, undefined, 2),
    "\n",
    JSON.stringify(state, undefined, 2),
  );
}

// assume that base value is not a list or an object
function baseIsTraitCase(tablet, record, trait, thing) {
  const { trait: base, thing: leaf } = tablet;

  const { [base]: baseValue, ...recordWithoutBase } = record;

  const passesConstraints = tablet.traitIsRegex || baseValue === trait;

  // if (!passesConstraints)
  //   log("item constrai", tablet, record, trait, thing, base, baseValue);

  const isMatch = passesConstraints && new RegExp(baseValue).test(trait);

  const leafValue = recordWithoutBase[leaf];

  // append if another value already exists
  const leafValues =
    leafValue === undefined ? thing : [leafValue, thing].flat();

  const recordNew = isMatch
    ? { ...recordWithoutBase, isMatch, [base]: baseValue, [leaf]: leafValues }
    : { ...recordWithoutBase, isMatch, [base]: baseValue };

  // if (isMatch) {
  //   log("base match", tablet, recordNew, trait, thing, base, baseValue);
  // } else {
  //   log("base no match", tablet, recordNew, trait, thing, base, baseValue);
  // }

  return recordNew;
}

function baseIsThingCase(tablet, record, trait, thing) {
  const { trait: leaf, thing: base } = tablet;

  // TODO what if traitValue is undefined here?
  const { [leaf]: omitted, ...recordWithoutLeaf } = record;

  let leafItems = Array.isArray(omitted) ? omitted : [omitted];

  // if record has a trait leaf and thing base, match it to trait to set base
  const stateValues = leafItems.reduce((state, leafObject) => {
    const isObject =
      !Array.isArray(leafObject) && typeof leafObject === "object";

    const leafValue = isObject ? leafObject[leaf] : leafObject;

    const passesConstraints = tablet.traitIsRegex || leafValue === trait;

    // if (!passesConstraints)
    //   log("item constrai", tablet, stateItem, trait, thing, leaf, leafValue);

    const isMatch = passesConstraints && new RegExp(leafValue).test(trait);

    const baseValue = state[base];

    const baseValues =
      baseValue === undefined ? thing : [baseValue, thing].flat();

    const recordNew = isMatch
      ? {
          ...state,
          isMatch,
          [leaf]: leafValue,
          [base]: baseValues,
        }
      : { ...state, isMatch, [leaf]: leafValue };

    // if (isMatch) {
    //   log("base match", tablet, recordNew, trait, thing, leaf, leafValue);
    // } else {
    //   log("base no match", tablet, recordNew, trait, thing, leaf, leafValue);
    // }

    return recordNew;
  }, recordWithoutLeaf);

  // log("step leaf", tablet, stateValues, trait, thing, leaf, leafItems);

  return stateValues;
}

function trunkIsTraitCase(tablet, record, trait, thing) {
  const { trait: trunk, thing: leaf } = tablet;
  // TODO what if traitValue is undefined here?
  const { [trunk]: omitted, ...recordWithoutTrunk } = record;

  let trunkItems = Array.isArray(omitted) ? omitted : [omitted];

  const stateValues = trunkItems.reduce((state, trunkObject) => {
    // log("item", tablet, state, trait, thing, trunk, trunkObject);

    const isObject =
      !Array.isArray(trunkObject) && typeof trunkObject === "object";

    const trunkValue = isObject ? trunkObject[trunk] : trunkObject;

    const passesConstraints = tablet.traitIsRegex || trunkValue === trait;

    // if (!passesConstraints)
    //   log("item constrai", tablet, state, trait, thing, trunk, trunkValue);

    const isMatch = passesConstraints && new RegExp(trunkValue).test(trait);

    // TODO try to take ...trunkObject if it has something
    const keyObject = { _: trunk, [trunk]: trunkValue, [leaf]: thing };

    const recordNew = isMatch
      ? { ...state, isMatch, [trunk]: keyObject }
      : {
          ...state, // TODO try to take ...trunkObject if it has something
          isMatch,
          [trunk]: trunkValue,
        };

    // if (isMatch) {
    //   log("leaf match", tablet, recordNew, trait, thing, trunk, trunkValue);
    // } else {
    //   log("leaf no match", tablet, recordNew, trait, thing, trunk, trunkValue);
    // }

    return recordNew;
  }, recordWithoutTrunk);

  // log("step trunk", tablet, stateValues, trait, thing, trunk, trunkItems);

  return stateValues;
}

// walk down the rest of the leaves to find the trait-thing pair
function leafIsObjectCase(tablet, record, trait, thing) {
  const { _: base, [base]: baseValueOmitted, ...recordWithoutBase } = record;

  // TODO can we guess here which of the remaining leaves leads to the tablet.trait?
  const entries = Object.entries(recordWithoutBase);

  // reduce each key-value pair to match trait and set thing
  const stateEntries = entries.reduce((accEntry, [leaf, leafValue]) => {
    // remove values of given key to rewrite later
    const { [leaf]: omitted, ...recordWithoutLeaf } = accEntry;

    let leafItems = Array.isArray(omitted) ? omitted : [omitted];

    // reduce each value item to match trait and set thing
    const stateValues = leafItems.reduce((state, leafItem) => {
      const isObject = !Array.isArray(leafItem) && typeof leafItem === "object";

      const { isMatch, ...stateObject } = isObject
        ? choose(tablet, leafItem, trait, thing)
        : { isMatch: false };

      const recordNew = isMatch
        ? { ...state, isMatch, [leaf]: stateObject }
        : { ...state, isMatch, [leaf]: leafItem };

      // if (isMatch) {
      //   log("item object", tablet, recordNew, trait, thing, leaf, leafItem);
      // } else {
      //   log("item not obj", tablet, recordNew, trait, thing, leaf, leafItem);
      // }

      return recordNew;
    }, recordWithoutLeaf);

    // TODO can values length be 0?
    // [leaf]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,

    // log("step values", tablet, stateValues, trait, thing, leaf, leafItems);

    return { ...accEntry, ...stateValues };
  }, record);

  // log("step entries", tablet, stateEntries, trait, thing);

  return stateEntries;
}

function choose(tablet, record, trait, thing) {
  const { _: base, [base]: baseValue } = record;

  const baseIsTrait = base === tablet.trait && baseValue !== undefined;

  // if base is trait for a leaf
  if (baseIsTrait) return baseIsTraitCase(tablet, record, trait, thing);

  const leafIsTrait = Object.hasOwn(record, tablet.trait);

  const baseIsThing = base === tablet.thing && leafIsTrait;

  // if trait is leaf of base
  if (baseIsThing) return baseIsThingCase(tablet, record, trait, thing);

  // if leaf is trait but base is not thing
  if (leafIsTrait) return trunkIsTraitCase(tablet, record, trait, thing);

  // if none of the fields are trait or thing, go into objects
  return leafIsObjectCase(tablet, record, trait, thing);
}

export function step(tablet, state, trait, thing) {
  // log("step", tablet, state, trait, thing);
  const { isMatch, ...current } = choose(tablet, state.current, trait, thing);

  const matched = isMatch ? current : undefined;

  const stateItem = { ...state, matched, current };

  return stateItem;
}
