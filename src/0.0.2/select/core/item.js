export function parseItem(tablet, state, trait, thing, key, item, omitted) {
  console.log(
    "item",
    tablet.filename,
    state.record._,
    "\n",
    trait,
    thing,
    "\n",
    key,
    JSON.stringify(item, undefined, 2),
    "\n",
    JSON.stringify(state, undefined, 2),
  );

  const { _: base } = state.record;
  // TODO erase regex here
  // TODO check previous trait here for next partial

  // if (!Array.isArray(item) && typeof item === "object") {}
  if (key === tablet.trait) {
    if (!tablet.traitIsRegex) {
      console.log(
        "constraints",
        tablet.hasConstraints,
        tablet.regexes,
        item,
        trait,
      );

      const failsConstraints = item !== trait;

      if (failsConstraints) {
        const stateItem = {
          ...state,
          record: { ...state.record, [key]: item },
        };

        console.log(
          "item fails constraints",
          tablet.filename,
          state.record._,
          "\n",
          trait,
          thing,
          "\n",
          key,
          JSON.stringify(item, undefined, 2),
          "\n",
          JSON.stringify(stateItem, undefined, 2),
        );

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
    // assume that trait is literal in state.record
    // assume that existing leaf value is a literal
    // append here if value already exists
    if (isMatch) {
      if (key === base || tablet.thing === base) {
        // TODO add to existing tablet.thing
        const things =
          state.record[tablet.thing] === undefined
            ? thing
            : [state.record[tablet.thing], thing].flat();

        const stateItem = {
          ...state,
          record: { ...state.record, [key]: item, [tablet.thing]: things },
        };

        console.log(
          "item base match",
          tablet.filename,
          state.record._,
          "\n",
          trait,
          thing,
          "\n",
          key,
          JSON.stringify(item, undefined, 2),
          "\n",
          JSON.stringify(stateItem, undefined, 2),
        );

        return stateItem;
      }

      if (key !== base && tablet.thing !== base) {
        // if key is not base, set key to object with tablet.thing: thing
        const keyObject = { _: key, [key]: item, [tablet.thing]: thing };

        const stateItem = {
          ...state,
          record: { ...state.record, [key]: keyObject },
        };

        console.log(
          "item leaf match",
          tablet.filename,
          state.record._,
          "\n",
          trait,
          thing,
          "\n",
          key,
          JSON.stringify(item, undefined, 2),
          "\n",
          JSON.stringify(stateItem, undefined, 2),
        );

        return stateItem;
      }
    }
  }

  const stateItem = { ...state, record: { ...state.record, [key]: omitted } };

  console.log(
    "item no match",
    tablet.filename,
    state.record._,
    "\n",
    trait,
    thing,
    "\n",
    key,
    JSON.stringify(item, undefined, 2),
    "\n",
    JSON.stringify(stateItem, undefined, 2),
  );

  return stateItem;
}

/**
 * This returns values that match at least one of regexes
 * @name matchRegexes
 * @export function
 * @param {string[]} regexes - list of regexes.
 * @param {string[]} values - list of values.
 * @returns {string[]}
 */
export function matchRegexes(regexes, values) {
  if (regexes === undefined || values === undefined) return [];

  const outcome = values.filter((value) =>
    regexes.some((regex) => new RegExp(regex).test(value)),
  );

  console.log("matchRegexes", regexes, values, outcome);

  return outcome;
}

/**
 * This returns values that appear in both as and bs
 * @name intersect
 * @export function
 * @param {string[]} as - list of values.
 * @param {string[]} bs - list of values.
 * @returns {string[]}
 */
export function intersect(as, bs) {
  return as.filter((a) => bs.includes(a));
}

export function stepOld(tablet, state, trait, thing) {
  console.log(
    "step",
    tablet.filename,
    // state.record._,
    "\n",
    trait,
    thing,
    "\n",
    JSON.stringify(state, undefined, 2),
  );

  const { _: base } = state.record;

  // iterate over fields of state.record
  const stepRes = Object.entries(state.record).reduce(
    (accEntry, [key, value]) => {
      // TODO if value is object but base is thing, match object's key
      // if value is object, step to value
      if (!Array.isArray(value) && typeof value === "object") {
        if (key === tablet.trait) {
          const item = value[key];

          // TODO use tablet.regexes
          const isMatch =
            matchRegexes(
              [item],
              // TODO replace this with .some()
              [trait],
            ).length > 0;

          // TODO how do i know here that trunk should become object?
          if (isMatch) {
            // if matched, set value of thing to thing value
            //

            // assume that thing is a leaf
            const leaf = tablet.thing;

            // if trait is not base, set trait to object
            // TODO what if trait is leaf and matches base?
            if (tablet.trait === base || tablet.thing === base) {
              const leafValue =
                accEntry.record[leaf] === undefined
                  ? thing
                  : [accEntry.record[leaf], thing];

              // const itemsPartial =
              //   accEntry.record[key] === undefined ? [] : accEntry.record[key];

              // const itemsOld = Array.isArray(itemsPartial)
              //   ? itemsPartial
              //   : [itemsPartial];

              // const itemsNew = itemsOld.length > 0 ? [...itemsOld, item] : item;

              const res = {
                ...accEntry,
                record: {
                  ...accEntry.record,
                  // [key]: item,
                  [leaf]: leafValue,
                },
                trait,
                next: true,
              };

              // console.log(
              //   "accEntry object base",
              //   JSON.stringify(res, undefined, 2),
              // );

              return res;
            }

            // assume that trait here is always trunk of thing
            const trunk = key;

            // assume that trait is literal in state.record
            const trunkValue = item;

            // assume that existing leaf value is a literal
            // append here if value already exists
            const leafValue =
              value[leaf] === undefined ? thing : [value[leaf], thing];

            const trunkObject = {
              _: trunk,
              ...value,
              [trunk]: trunkValue,
              [leaf]: leafValue,
            };

            // const itemsPartial =
            //   accEntry.record[key] === undefined ? [] : accEntry.record[key];

            // const itemsOld = Array.isArray(itemsPartial)
            //   ? itemsPartial
            //   : [itemsPartial];

            // const itemsNew =
            //   itemsOld.length > 0 ? [...itemsOld, trunkObject] : trunkObject;

            const res = {
              ...accEntry,
              record: {
                ...accEntry.record,
                [trunk]: trunkObject,
              },
              trait,
              next: true,
            };

            // console.log(
            //   "accEntry object leaf",
            //   tablet.filename,
            //   base,
            //   "\n",
            //   value,
            //   "\n",
            //   trait,
            //   "\n",
            //   thing,
            //   "\n",
            //   JSON.stringify(accEntry, undefined, 2),
            //   "\n",
            //   JSON.stringify(res, undefined, 2),
            // );

            return res;
          }

          // const itemsPartial =
          //   accEntry.record[key] === undefined ? [] : accEntry.record[key];

          // const itemsOld = Array.isArray(itemsPartial)
          //   ? itemsPartial
          //   : [itemsPartial];

          // const itemsNew = itemsOld.length > 0 ? [...itemsOld, item] : item;

          const res = {
            ...accEntry,
            record: { ...accEntry.record, [key]: value },
          };

          // console.log(
          //   "accEntry object nomatch",
          //   JSON.stringify(res, undefined, 2),
          // );

          return res;
        }

        const stateObject = { record: value };

        const itemNew = step(tablet, stateObject, trait, thing).record;

        const res = {
          ...accEntry,
          record: { ...accEntry.record, [key]: itemNew },
        };

        // console.log(
        //   "accEntry object notrait",
        //   JSON.stringify(res, undefined, 2),
        // );

        return res;
      }

      let values = Array.isArray(value) ? value : [value];

      // TODO what if accItem already has more values than value?
      // then omitter loses them and shadows with old value
      // instead should not omit, but pass accEntry as is
      if (
        accEntry.record[key] !== undefined &&
        JSON.stringify([accEntry.record[key]].flat()) !== JSON.stringify(values)
      )
        values = accEntry.record[key];

      const { [key]: omitted, ...recordWithoutKey } = accEntry.record;

      // TODO can values length be 0?
      //    // [key]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,

      const valuesRes = values.reduce(
        (accItem, item) => {
          if (!Array.isArray(item) && typeof item === "object") {
            const itemNew = step(tablet, { record: item }, trait, thing).record;

            const itemsPartial =
              accItem.record[key] === undefined ? [] : accItem.record[key];

            const itemsOld = Array.isArray(itemsPartial)
              ? itemsPartial
              : [itemsPartial];

            const itemsNew =
              itemsOld.length > 0 ? [...itemsOld, itemNew] : itemNew;

            const res = {
              ...accItem,
              record: {
                ...accItem.record,
                [key]: itemsNew,
              },
              // next: true,
            };

            // console.log("accItem object", JSON.stringify(res, undefined, 2));

            return res;
          }

          // otherwise if value is literal, match against tablet and line
          // if key is trait branch, match trait value against value
          if (key === tablet.trait) {
            if (tablet.hasConstraints) {
              // assume that trait is not regex but one literal value
              // should be safe here because of the strategy
              // TODO what about trait that is regex but not value?
              // TODO use tablet.regexes
              const failsConstraints =
                (tablet.regexes === undefined ||
                  !tablet.regexes.includes(item)) &&
                item !== trait;

              const itemsPartial =
                accItem.record[key] === undefined ? [] : accItem.record[key];

              const itemsOld = Array.isArray(itemsPartial)
                ? itemsPartial
                : [itemsPartial];

              const itemsNew = itemsOld.length > 0 ? [...itemsOld, item] : item;

              if (failsConstraints) {
                const res = {
                  ...accItem,
                  record: { ...accItem.record, [key]: itemsNew },
                };

                // console.log(
                //   "accItem fails constraints",
                //   JSON.stringify(res, undefined, 2),
                // );

                return res;
              }
            }

            // TODO use tablet.regexes
            const isMatch =
              matchRegexes(
                [item],
                // TODO replace this with .some()
                [trait],
              ).length > 0;

            // TODO how do i know here that trunk should become object?
            if (isMatch) {
              // if matched, set value of thing to thing value
              //

              // assume that thing is a leaf
              const leaf = tablet.thing;

              // if trait is not base, set trait to object
              // TODO what if trait is leaf and matches base?
              if (tablet.trait === base || tablet.thing === base) {
                const leafValue =
                  accItem.record[leaf] === undefined
                    ? thing
                    : [accItem.record[leaf], thing];

                const itemsPartial =
                  accItem.record[key] === undefined ? [] : accItem.record[key];

                const itemsOld = Array.isArray(itemsPartial)
                  ? itemsPartial
                  : [itemsPartial];

                const itemsNew =
                  itemsOld.length > 0 ? [...itemsOld, item] : item;

                // TODO we should not set leaf here if

                const res = {
                  ...accItem,
                  record: {
                    ...accItem.record,
                    [key]: itemsNew,
                    [leaf]: leafValue,
                  },
                  trait,
                  next: true,
                };

                console.log(
                  "accItem matches base",
                  JSON.stringify(accItem, undefined, 2),
                  JSON.stringify(res, undefined, 2),
                );

                return res;
              }

              // assume that trait here is always trunk of thing
              const trunk = key;

              // assume that trait is literal in state.record
              const trunkValue = item;

              // assume that existing leaf value is a literal
              // append here if value already exists
              const leafValue =
                accItem.record[leaf] === undefined
                  ? thing
                  : [accItem.record[leaf], thing];

              const trunkObject = {
                _: trunk,
                [trunk]: trunkValue,
                [leaf]: leafValue,
              };

              const itemsPartial =
                accItem.record[key] === undefined ? [] : accItem.record[key];

              const itemsOld = Array.isArray(itemsPartial)
                ? itemsPartial
                : [itemsPartial];

              const itemsNew =
                itemsOld.length > 0 ? [...itemsOld, trunkObject] : trunkObject;

              const res = {
                ...accItem,
                record: {
                  ...accItem.record,
                  [trunk]: itemsNew,
                },
                trait,
                next: true,
              };

              console.log(
                "accItem matches leaf",
                JSON.stringify(res, undefined, 2),
              );

              return res;
            }
          }

          const itemsPartial =
            accItem.record[key] === undefined ? [] : accItem.record[key];

          const itemsOld = Array.isArray(itemsPartial)
            ? itemsPartial
            : [itemsPartial];

          const itemsNew = itemsOld.length > 0 ? [...itemsOld, item] : item;

          const res = {
            ...accItem,
            record: { ...accItem.record, [key]: itemsNew },
          };

          // console.log(
          //   "accItem no match",
          //   base,
          //   key,
          //   JSON.stringify(res, undefined, 2),
          // );

          return res;
        },
        { ...state, record: recordWithoutKey },
      );

      // console.log(
      //   "values result",
      //   base,
      //   key,
      //   JSON.stringify(valuesRes, undefined, 2),
      // );

      return { ...accEntry, ...valuesRes };
    },
    state,
  );

  // console.log(
  //   "step result",
  //   tablet.filename,
  //   state.record._,
  //   "\n",
  //   trait,
  //   thing,
  //   "\n",
  //   JSON.stringify(stepRes, undefined, 2),
  // );

  return stepRes;
}
