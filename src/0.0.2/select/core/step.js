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

function baseIsTraitFoo(tablet, stateBase, trait, thing) {
  // assume that base value is not a list or an object
  const { _: key, [key]: item, ...recordWithoutBase } = stateBase.current;

  const state = { ...stateBase, current: { _: key, ...recordWithoutBase } };

  const failsConstraints = tablet.traitIsRegex === undefined && item !== trait;

  if (failsConstraints)
    log("item constrai", tablet, state, trait, thing, key, item);

  const isMatch = !failsConstraints && new RegExp(item).test(trait);

  if (isMatch) {
    // append if another value already exists
    const things =
      state.current[tablet.thing] === undefined
        ? thing
        : [state.current[tablet.thing], thing].flat();

    const stateItem = {
      ...state,
      matched: { ...state.current, [key]: item, [tablet.thing]: things },
      current: { ...state.current, [key]: item, [tablet.thing]: things },
    };

    log("match base", tablet, stateItem, trait, thing, key, item);

    return stateItem;
  }

  const stateItem = { ...state, current: { ...state.current, [key]: item } };

  log("item no match", tablet, stateItem, trait, thing, key, item);

  return stateItem;
}

function baseIsThingFoo(tablet, stateBase, trait, thing) {
  // TODO what if traitValue is undefined here?
  const { [tablet.trait]: value, ...recordWithoutLeaf } = stateBase.current;

  let values = Array.isArray(value) ? value : [value];

  // if record has a trait leaf and thing base, match it to trait to set base
  const stateValues = values.reduce(
    (state, itemObj) => {
      const key = tablet.trait;

      // take item[tablet.trait] as item value
      const isObject = !Array.isArray(itemObj) && typeof itemObj === "object";

      const item = isObject ? itemObj[tablet.trait] : itemObj;

      const failsConstraints =
        tablet.traitIsRegex === undefined && item !== trait;

      if (failsConstraints)
        log("item constrai", tablet, stateItem, trait, thing, key, item);

      const isMatch = !failsConstraints && new RegExp(item).test(trait);

      if (isMatch) {
        const things =
          state.current[tablet.thing] === undefined
            ? thing
            : [state.current[tablet.thing], thing].flat();

        const stateItem = {
          ...state,
          matched: {
            ...state.current,
            [key]: item,
            [tablet.thing]: things,
          },
          current: {
            ...state.current,
            [key]: item,
            [tablet.thing]: things,
          },
        };

        log("match base", tablet, stateItem, trait, thing, key, item);

        return stateItem;
      }

      const stateItem = {
        ...state,
        current: { ...state.current, [key]: item },
      };

      log("item no match", tablet, stateItem, trait, thing, key, item);

      return stateItem;
    },
    { ...stateBase, current: recordWithoutLeaf },
  );

  log("step leaf", tablet, stateValues, trait, thing, tablet.trait, value);

  return stateValues;
}

function leafIsTraitFoo(tablet, stateBase, trait, thing) {
  // TODO what if traitValue is undefined here?
  const { [tablet.trait]: value, ...recordWithoutLeaf } = stateBase.current;

  let values = Array.isArray(value) ? value : [value];

  const stateValues = values.reduce(
    (state, item) => {
      const key = tablet.trait;

      log("item", tablet, state, trait, thing, key, item);

      // TODO if item is object, set item value to item[key] and object field to thing
      // const isObject = !Array.isArray(item) && typeof item === "object";

      const failsConstraints =
        tablet.traitIsRegex === undefined && item !== trait;

      if (failsConstraints)
        log("item constrai", tablet, state, trait, thing, key, item);

      const isMatch = !failsConstraints && new RegExp(item).test(trait);

      if (isMatch) {
        const keyObject = { _: key, [key]: item, [tablet.thing]: thing };

        const stateItem = {
          ...state,
          matched: { ...state.current, [key]: keyObject },
          current: { ...state.current, [key]: keyObject },
        };

        log("match leaf", tablet, stateItem, trait, thing, key, item);

        return stateItem;
      }

      const stateItem = {
        ...state,
        current: { ...state.current, [key]: item },
      };

      log("item no match", tablet, stateItem, trait, thing, key, item);

      return stateItem;
    },
    { ...stateBase, current: recordWithoutLeaf },
  );

  log("step trunk", tablet, stateValues, trait, thing, tablet.trait, value);

  return stateValues;
}

function entriesFoo(tablet, stateOld, trait, thing) {
  const {
    _: base,
    [base]: baseValueOmitted,
    ...recordWithoutBase
  } = stateOld.current;

  // TODO can we guess here which of the remaining leaves leads to the tablet.trait?
  // walk down the rest of the leaves to find the trait-thing pair
  const entries = Object.entries(recordWithoutBase);

  // reduce each key-value pair to match trait and set thing
  const stateEntries = entries.reduce((accEntry, [key, value]) => {
    let values = Array.isArray(value) ? value : [value];

    // remove values of given key to rewrite later
    const { [key]: omitted, ...recordWithoutKey } = accEntry.current;

    // reduce each value item to match trait and set thing
    const stateValues = values.reduce(
      (state, item) => {
        const isObject = !Array.isArray(item) && typeof item === "object";

        if (isObject) {
          const stateObject = step(tablet, { current: item }, trait, thing);

          const matchedPartial = stateObject.matched
            ? { matched: { ...state.current, [key]: stateObject.matched } }
            : {};

          const stateItem = {
            ...state,
            current: { ...state.current, [key]: stateObject.current },
            ...matchedPartial,
          };

          log("item object", tablet, stateItem, trait, thing, key, item);

          return stateItem;
        }

        const stateItem = {
          ...state,
          current: { ...state.current, [key]: item },
        };

        log("item not object", tablet, stateItem, trait, thing, key, item);

        return stateItem;
      },
      {
        ...accEntry,
        current: recordWithoutKey,
      },
    );

    // TODO can values length be 0?
    // [key]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,

    log("step values", tablet, stateValues, trait, thing, key, value);

    return { ...accEntry, ...stateValues };
  }, stateOld);

  log("step entries", tablet, stateEntries, trait, thing);

  return stateEntries;
}

export function step(tablet, state, trait, thing) {
  log("step", tablet, state, trait, thing);

  const { _: base, [base]: baseValue } = state.current;

  const baseIsTrait = base === tablet.trait && baseValue !== undefined;

  // if base is trait for a leaf
  if (baseIsTrait) return baseIsTraitFoo(tablet, state, trait, thing);

  const leafIsTrait = Object.hasOwn(state.current, tablet.trait);

  const baseIsThing = base === tablet.thing && leafIsTrait;

  // if trait is leaf of base
  if (baseIsThing) return baseIsThingFoo(tablet, state, trait, thing);

  // if leaf is trait but base is not thing
  if (leafIsTrait) return leafIsTraitFoo(tablet, state, trait, thing);

  // if none of the fields are trait or thing, go into objects
  return entriesFoo(tablet, state, trait, thing);
}
