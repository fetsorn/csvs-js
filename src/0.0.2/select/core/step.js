function match(tablet, state, thing, key, item) {
  const { _: base } = state.current;

  // TODO move this somewhere
  if (key === base || tablet.thing === base) {
    // TODO add to existing tablet.thing
    const things =
      state.current[tablet.thing] === undefined
        ? thing
        : [state.current[tablet.thing], thing].flat();

    const stateItem = {
      ...state,
      matched: { ...state.current, [key]: item, [tablet.thing]: things },
      current: { ...state.current, [key]: item, [tablet.thing]: things },
      next: true,
    };

    // console.log(
    //   "match base",
    //   tablet.filename,
    //   state.current._,
    //   "\n",
    //   JSON.stringify(thing, undefined, 2),
    //   "\n",
    //   key,
    //   JSON.stringify(item, undefined, 2),
    //   "\n",
    //   JSON.stringify(stateItem, undefined, 2),
    // );

    return stateItem;
  }

  if (key !== base && tablet.thing !== base) {
    // if key is not base, set key to object with tablet.thing: thing
    const keyObject = { _: key, [key]: item, [tablet.thing]: thing };

    const stateItem = {
      ...state,
      matched: { ...state.current, [key]: keyObject },
      current: { ...state.current, [key]: keyObject },
      next: true,
    };

    // console.log(
    //   "match leaf",
    //   tablet.filename,
    //   state.current._,
    //   "\n",
    //   JSON.stringify(thing, undefined, 2),
    //   "\n",
    //   key,
    //   JSON.stringify(item, undefined, 2),
    //   "\n",
    //   JSON.stringify(stateItem, undefined, 2),
    // );

    return stateItem;
  }
}

export function parseItem(tablet, state, trait, thing, key, item) {
  // console.log(
  //   "item",
  //   tablet.filename,
  //   state.current._,
  //   "\n",
  //   JSON.stringify(trait, undefined, 2),
  //   JSON.stringify(thing, undefined, 2),
  //   "\n",
  //   key,
  //   JSON.stringify(item, undefined, 2),
  //   "\n",
  //   JSON.stringify(state, undefined, 2),
  // );

  if (!Array.isArray(item) && typeof item === "object") {
    const stateObject = step(tablet, { current: item }, trait, thing);

    const matchedPartial = stateObject.matched
      ? { matched: { ...state.current, [key]: stateObject.matched } }
      : {};

    const stateItem = {
      ...state,
      current: { ...state.current, [key]: stateObject.current },
      ...matchedPartial,
    };

    // console.log(
    //   "item fails constraints",
    //   tablet.filename,
    //   state.current._,
    //   "\n",
    //   JSON.stringify(trait, undefined, 2),
    //   JSON.stringify(thing, undefined, 2),
    //   "\n",
    //   key,
    //   JSON.stringify(item, undefined, 2),
    //   "\n",
    //   JSON.stringify(stateItem, undefined, 2),
    // );

    return stateItem;
  }

  if (key === tablet.trait) {
    if (tablet.traitIsRegex === undefined) {
      // console.log(
      //   "constraints",
      //   tablet.hasConstraints,
      //   tablet.regexes,
      //   item,
      //   trait,
      // );

      const failsConstraints = item !== trait;

      if (failsConstraints) {
        const stateItem = {
          ...state,
          current: { ...state.current, [key]: item },
        };

        // console.log(
        //   "item fails constraints",
        //   tablet.filename,
        //   state.current._,
        //   "\n",
        //   JSON.stringify(trait, undefined, 2),
        //   JSON.stringify(thing, undefined, 2),
        //   "\n",
        //   key,
        //   JSON.stringify(item, undefined, 2),
        //   "\n",
        //   JSON.stringify(stateItem, undefined, 2),
        // );

        return stateItem;
      }
    }
    // TODO use tablet.regexes
    // TODO if value is object but base is thing, match object's key
    // if value is object, step to value
    // otherwise if value is literal, match against tablet and line
    // if key is trait branch, match trait value against value
    const isMatch = typeof item !== "object" && new RegExp(item).test(trait);
    // matchRegexes(
    //   [item],
    //   // TODO replace this with .some()
    //   [trait],
    // ).length > 0;

    // assume that thing is a leaf
    // if trait is not base, set trait to object
    // assume that trait here is always trunk of thing
    // assume that trait is literal in state.current
    // assume that existing leaf value is a literal
    // append here if value already exists
    if (isMatch) {
      return match(tablet, state, thing, key, item);
    }
  }

  const stateItem = { ...state, current: { ...state.current, [key]: item } };

  // console.log(
  //   "item no match",
  //   tablet.filename,
  //   state.current._,
  //   "\n",
  //   JSON.stringify(trait, undefined, 2),
  //   JSON.stringify(thing, undefined, 2),
  //   "\n",
  //   key,
  //   JSON.stringify(item, undefined, 2),
  //   "\n",
  //   JSON.stringify(stateItem, undefined, 2),
  // );

  return stateItem;
}

export function step(tablet, state, trait, thing) {
  // console.log(
  //   "step",
  //   tablet.filename,
  //   state.current._,
  //   "\n",
  //   JSON.stringify(trait, undefined, 2),
  //   JSON.stringify(thing, undefined, 2),
  //   "\n",
  //   JSON.stringify(state, undefined, 2),
  // );

  const { _: base, [base]: baseValue, ...recordWithoutBase } = state.current;

  const baseIsTrait = base === tablet.trait && baseValue !== undefined;

  if (baseIsTrait) {
    // if base is trait, match it to trait to set leaf thing
    // assume that base value is not a list or an object
    const stateItem = parseItem(
      tablet,
      { ...state, current: { _: base, ...recordWithoutBase } },
      trait,
      thing,
      base,
      baseValue,
    );

    // there's nothing else to do in this tablet, return object
    // console.log(
    //   "step base",
    //   tablet.filename,
    //   state.current._,
    //   "\n",
    //   JSON.stringify(trait, undefined, 2),
    //   JSON.stringify(thing, undefined, 2),
    //   "\n",
    //   base,
    //   JSON.stringify(state.current[base], undefined, 2),
    //   "\n",
    //   JSON.stringify(stateItem, undefined, 2),
    // );

    return stateItem;
  }

  const leafIsTrait = Object.hasOwn(state.current, tablet.trait);

  const baseIsThing = base === tablet.thing && leafIsTrait;

  if (baseIsThing) {
    // TODO what if traitValue is a list here?
    // TODO what if traitValue is undefined here?
    const { [tablet.trait]: value, ...recordWithoutLeaf } = state.current;

    let values = Array.isArray(value) ? value : [value];

    // if record has a trait leaf and thing base, match it to trait to set base
    const stateItem = values.reduce(
      (accItem, item) =>
        parseItem(tablet, accItem, trait, thing, tablet.trait, item),
      { ...state, current: recordWithoutLeaf },
    );

    // there's nothing else to do in this tablet, return object
    // console.log(
    //   "step leaf",
    //   tablet.filename,
    //   state.current._,
    //   "\n",
    //   JSON.stringify(trait, undefined, 2),
    //   JSON.stringify(thing, undefined, 2),
    //   "\n",
    //   tablet.trait,
    //   JSON.stringify(value, undefined, 2),
    //   "\n",
    //   JSON.stringify(stateItem, undefined, 2),
    // );

    return stateItem;
  }

  // if leaf is trait but base is not thing
  if (leafIsTrait) {
    // TODO what if traitValue is a list here?
    // TODO what if traitValue is undefined here?
    const { [tablet.trait]: value, ...recordWithoutLeaf } = state.current;

    let values = Array.isArray(value) ? value : [value];

    // if record has a trait leaf that is trunk of a thing
    // match it to trait value to set an object with leaf thing
    const stateItem = values.reduce(
      (accItem, item) =>
        parseItem(tablet, accItem, trait, thing, tablet.trait, item),
      { ...state, current: recordWithoutLeaf },
    );

    // there's nothing else to do in this tablet, return object
    // console.log(
    //   "step trunk",
    //   tablet.filename,
    //   state.current._,
    //   "\n",
    //   JSON.stringify(trait, undefined, 2),
    //   JSON.stringify(thing, undefined, 2),
    //   "\n",
    //   tablet.trait,
    //   JSON.stringify(value, undefined, 2),
    //   "\n",
    //   JSON.stringify(stateItem, undefined, 2),
    // );

    return stateItem;
  }

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
      (accItem, item) => parseItem(tablet, accItem, trait, thing, key, item),
      {
        ...accEntry,
        current: recordWithoutKey,
      },
    );

    // TODO can values length be 0?
    // [key]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,

    // console.log(
    //   "step values",
    //   tablet.filename,
    //   state.current._,
    //   "\n",
    //   key,
    //   value,
    //   "\n",
    //   JSON.stringify(stateValues, undefined, 2),
    // );

    return { ...accEntry, ...stateValues };
  }, state);

  // console.log(
  //   "step entries",
  //   tablet.filename,
  //   state.current._,
  //   "\n",
  //   trait,
  //   thing,
  //   "\n",
  //   JSON.stringify(stateEntries, undefined, 2),
  // );

  return stateEntries;
}
