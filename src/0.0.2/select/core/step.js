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
function baseIsTraitFoo(tablet, state, trait, thing) {
  const { trait: base, thing: leaf } = tablet;

  const { [base]: baseValue, ...recordWithoutBase } = state.current;

  const passesConstraints = tablet.traitIsRegex || baseValue === trait;

  // if (!passesConstraints)
  //   log("item constrai", tablet, state, trait, thing, base, baseValue);

  const isMatch = passesConstraints && new RegExp(baseValue).test(trait);

  const leafValue = recordWithoutBase[leaf];

  // append if another value already exists
  const leafValues =
    leafValue === undefined ? thing : [leafValue, thing].flat();

  const current = isMatch
    ? { ...recordWithoutBase, [base]: baseValue, [leaf]: leafValues }
    : { ...recordWithoutBase, [base]: baseValue };

  const matched = isMatch ? current : undefined;

  const stateItem = { ...state, matched, current };

  // if (isMatch) {
  //   log("base match", tablet, stateItem, trait, thing, base, baseValue);
  // } else {
  //   log("base no match", tablet, stateItem, trait, thing, base, baseValue);
  // }

  return stateItem;
}

function baseIsThingFoo(tablet, stateBase, trait, thing) {
  const { trait: leaf, thing: base } = tablet;

  // TODO what if traitValue is undefined here?
  const { [leaf]: omitted, ...recordWithoutLeaf } = stateBase.current;

  let leafItems = Array.isArray(omitted) ? omitted : [omitted];

  // if record has a trait leaf and thing base, match it to trait to set base
  const stateValues = leafItems.reduce(
    (state, leafObject) => {
      const isObject =
        !Array.isArray(leafObject) && typeof leafObject === "object";

      const leafValue = isObject ? leafObject[leaf] : leafObject;

      const passesConstraints = tablet.traitIsRegex || leafValue === trait;

      // if (!passesConstraints)
      //   log("item constrai", tablet, stateItem, trait, thing, leaf, leafValue);

      const isMatch = passesConstraints && new RegExp(leafValue).test(trait);

      const baseValue = state.current[base];

      const baseValues =
        baseValue === undefined ? thing : [baseValue, thing].flat();

      const current = isMatch
        ? {
            ...state.current,
            [leaf]: leafValue,
            [base]: baseValues,
          }
        : { ...state.current, [leaf]: leafValue };

      const matched = isMatch ? current : undefined;

      const stateItem = { ...state, matched, current };

      // if (isMatch) {
      //   log("base match", tablet, stateItem, trait, thing, leaf, leafValue);
      // } else {
      //   log("base no match", tablet, stateItem, trait, thing, leaf, leafValue);
      // }

      return stateItem;
    },
    { ...stateBase, current: recordWithoutLeaf },
  );

  // log("step leaf", tablet, stateValues, trait, thing, leaf, leafItems);

  return stateValues;
}

function trunkIsTraitFoo(tablet, stateBase, trait, thing) {
  const { trait: trunk, thing: leaf } = tablet;
  // TODO what if traitValue is undefined here?
  const { [trunk]: omitted, ...recordWithoutTrunk } = stateBase.current;

  let trunkItems = Array.isArray(omitted) ? omitted : [omitted];

  const stateValues = trunkItems.reduce(
    (state, trunkObject) => {
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

      const current = isMatch
        ? { ...state.current, [trunk]: keyObject }
        : {
            ...state.current, // TODO try to take ...trunkObject if it has something
            [trunk]: trunkValue,
          };

      const matched = isMatch ? current : undefined;

      const stateItem = { ...state, matched, current };

      // if (isMatch) {
      //   log("leaf match", tablet, stateItem, trait, thing, trunk, trunkValue);
      // } else {
      //   log("leaf no match", tablet, stateItem, trait, thing, trunk, trunkValue);
      // }

      return stateItem;
    },
    { ...stateBase, current: recordWithoutTrunk },
  );

  // log("step trunk", tablet, stateValues, trait, thing, trunk, trunkItems);

  return stateValues;
}

// walk down the rest of the leaves to find the trait-thing pair
function entriesFoo(tablet, stateBase, trait, thing) {
  const {
    _: base,
    [base]: baseValueOmitted,
    ...recordWithoutBase
  } = stateBase.current;

  // TODO can we guess here which of the remaining leaves leads to the tablet.trait?
  const entries = Object.entries(recordWithoutBase);

  // reduce each key-value pair to match trait and set thing
  const stateEntries = entries.reduce((accEntry, [leaf, leafValue]) => {
    // remove values of given key to rewrite later
    const { [leaf]: omitted, ...recordWithoutLeaf } = accEntry.current;

    let leafItems = Array.isArray(omitted) ? omitted : [omitted];

    // reduce each value item to match trait and set thing
    const stateValues = leafItems.reduce(
      (state, leafItem) => {
        const isObject =
          !Array.isArray(leafItem) && typeof leafItem === "object";

        const stateObject = isObject
          ? step(tablet, { current: leafItem }, trait, thing)
          : {};

        const isMatch = stateObject.matched !== undefined;

        const current = isMatch
          ? { ...state.current, [leaf]: stateObject.current }
          : { ...state.current, [leaf]: leafItem };

        const matched = stateObject.matched ? current : undefined;

        const stateItem = { ...state, current, matched };

        // if (isMatch) {
        //   log("item object", tablet, stateItem, trait, thing, leaf, leafItem);
        // } else {
        //   log("item not obj", tablet, stateItem, trait, thing, leaf, leafItem);
        // }

        return stateItem;
      },
      {
        ...accEntry,
        current: recordWithoutLeaf,
      },
    );

    // TODO can values length be 0?
    // [leaf]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,

    // log("step values", tablet, stateValues, trait, thing, leaf, leafItems);

    return { ...accEntry, ...stateValues };
  }, stateBase);

  // log("step entries", tablet, stateEntries, trait, thing);

  return stateEntries;
}

export function step(tablet, state, trait, thing) {
  // log("step", tablet, state, trait, thing);

  const { _: base, [base]: baseValue } = state.current;

  const baseIsTrait = base === tablet.trait && baseValue !== undefined;

  // if base is trait for a leaf
  if (baseIsTrait) return baseIsTraitFoo(tablet, state, trait, thing);

  const leafIsTrait = Object.hasOwn(state.current, tablet.trait);

  const baseIsThing = base === tablet.thing && leafIsTrait;

  // if trait is leaf of base
  if (baseIsThing) return baseIsThingFoo(tablet, state, trait, thing);

  // if leaf is trait but base is not thing
  if (leafIsTrait) return trunkIsTraitFoo(tablet, state, trait, thing);

  // if none of the fields are trait or thing, go into objects
  return entriesFoo(tablet, state, trait, thing);
}
