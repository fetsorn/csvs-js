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
  return values.filter((value) =>
    regexes.some((regex) => new RegExp(regex).test(value)),
  );
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

function bk(state, tablet, key, value) {
  // take some information about the schema from the tablet object
  const { schema } = tablet;

  // TODO match constraints
  if (tablet.hasConstraints) {
    const failsConstraints =
      state.record[tablet.trait] !== undefined &&
      !state.record[tablet.trait].includes(key);

    if (failsConstraints) return state;
  }

  if (tablet.isValue) {
    // TODO get nested values from record
    // right now tries to get nested at first level,
    // finds either undefined or object and matches all
    // trunk keys from the record
    // const regexes = state.record[tablet.trait];
    // const pathTrunk = tablet.path.slice(0, -1);

    // TODO rewrite getPath to schema with tablet.trait as trunk
    // TODO handle when pathTrunk is long but trunk is undefined
    // const valueTrunk = pathTrunk.length > 0
    //       ? getPath(state.record, pathTrunk)
    //       : state.record;

    // const valueTrunkValue = typeof valueTrunk === "object"
    //       ? valueTrunk[tablet.trait]
    //       : valueTrunk;

    // TODO how do we know what trunk to write value to if trunk is a list?
    const valueTrunk = schema[tablet.thing].trunk
      ? "" // getValue(schema, tablet.trait, state.record)
      : state.record;

    const valueTrunkValue =
      typeof valueTrunk === "object" ? valueTrunk[tablet.trait] : valueTrunk;

    const regexes = valueTrunkValue === undefined ? [] : valueTrunkValue;

    // match value by key
    const isMatch =
      matchRegexes(
        Array.isArray(regexes) ? regexes : [regexes],
        // TODO replace this with .some()
        [key],
      ).length > 0;

    if (isMatch) {
      // if key is the same, keep adding to list
      // if key is different, push previous record
      const nextPartial =
        state.keyPrevious === undefined || key === state.keyPrevious
          ? { keyPrevious: key }
          : { keyPrevious: key, next: true };

      // const pathTrunk = tablet.path.slice(0, -1);

      // const valueTrunk = getPath(state.record, pathTrunk)

      if (valueTrunk !== undefined && typeof valueTrunk !== "object") {
        // const [trunk] = pathTrunk.slice(-1);
        // const { trunk } = schema[tablet.thing];

        // const objectTrunk = { _: trunk, [trunk]: valueTrunk };

        // TODO rewrite setPath to schema with tablet.trait as trunk
        // const recordTrunk = setValue(
        //   schema,
        //   tablet.trait,
        //   state.record,
        //   objectTrunk,
        // );

        // TODO rewrite setPath to schema with tablet.trait as trunk
        const recordNew = {}; // setValue(schema, tablet.thing, recordTrunk, value);

        // TODO append to list if key === state.keyPrevious

        return { record: recordNew, ...nextPartial };
      } else {
        // TODO rewrite setPath to schema with tablet.trait as trunk
        const recordNew = {}; // setValue(schema, tablet.thing, state.record, value);

        // TODO append to list if key === state.keyPrevious

        return { record: recordNew, ...nextPartial };
      }
    } else {
      return { record: state.record };
    }
  } else {
    // does key match regex?
    const isMatch =
      matchRegexes(
        tablet.regexes,
        // TODO replace this with .some()
        [key],
      ).length > 0;

    if (isMatch) {
      // if key is the same, keep adding to list
      // if key is different, push previous record
      const nextPartial =
        state.keyPrevious === undefined || key === state.keyPrevious
          ? { keyPrevious: key }
          : { keyPrevious: key, next: true };

      // push to keys
      // TODO append to list if key === state.keyPrevious
      // TODO rewrite setPath to schema with tablet.trait as trunk
      return {
        record: { ...state.record, [tablet.thing]: value },
        ...nextPartial,
      };
    } else {
      return { record: state.record };
    }
  }
}

export function stepOld(tablet, state, trait, thing) {
  // console.log("step", state, trait, thing);

  const { _: base } = state.record;

  // iterate over fields of state.record
  return Object.entries(state.record).reduce((acc, [key, value]) => {
    // if value is list, map step to items
    if (Array.isArray(value)) {
      const values = value.map((item) => {
        const stateItem = { record: item };

        return step(tablet, stateItem, trait, thing).record;
      });

      return {
        ...acc,
        record: {
          ...acc.record,
          [key]: values,
        },
      };
    }

    // if value is object, step to value
    if (typeof value === "object") {
      const stateObject = { record: value };

      return {
        ...acc,
        record: {
          ...acc.record,
          [key]: step(tablet, stateObject, trait, thing).record,
        },
      };
    }

    // if value is literal, match against tablet and line

    // if (tablet.filename === `${base}-${key}.csv`) {
    // }
    // here base is root, so if key is base and value is literal, match and append

    // query base by key
    // TODO how do I add a new field?
    //
    if (key === tablet.trait) {
      if (
        tablet.filename === "datum-actname.csv" &&
        trait === "name1" &&
        thing === "value1"
      )
        return {
          ...acc,
          record: { ...acc.record, datum: "value1" },
          next: true,
        };
    }

    if (key === base) {
      if (
        tablet.filename === "datum-actname.csv" &&
        trait === "value1" &&
        thing === "name1"
      )
        return {
          ...acc,
          record: { ...acc.record, actname: "name1" },
          next: true,
        };

      if (
        tablet.filename === "datum-actdate.csv" &&
        trait === "value1" &&
        thing === "2001-01-01"
      )
        return {
          ...acc,
          record: { ...acc.record, actdate: "2001-01-01" },
          next: true,
        };

      if (
        tablet.filename === "datum-saydate.csv" &&
        trait === "value1" &&
        thing === "2001-01-01"
      )
        return {
          ...acc,
          record: { ...acc.record, saydate: "2001-01-01" },
          next: true,
        };

      if (
        tablet.filename === "datum-sayname.csv" &&
        trait === "value1" &&
        thing === "name1"
      )
        return {
          ...acc,
          record: { ...acc.record, sayname: "name1" },
          next: true,
        };

      if (
        tablet.filename === "datum-filepath.csv" &&
        trait === "value1" &&
        thing === "path/to/1"
      )
        return {
          ...acc,
          record: { ...acc.record, filepath: "path/to/1" },
          next: true,
        };

      if (
        tablet.filename === "filepath-moddate.csv" &&
        trait === "path/to/1" &&
        thing === "2001-01-01"
      )
        return {
          ...acc,
          record: {
            ...acc.record,
            filepath: {
              _: "filepath",
              filepath: "path/to/1",
              moddate: "2001-01-01",
            },
          },
          next: true,
        };
    }

    return acc;
  }, state);
}

export function step(tablet, state, trait, thing) {
  // if (tablet.filename === "export_tags-export1_tag.csv")
  console.log(
    "step",
    tablet.filename,
    state.record._,
    "\n",
    trait,
    thing,
    "\n",
    JSON.stringify(state, undefined, 2),
  );

  const { _: base } = state.record;

  // iterate over fields of state.record
  const bar = Object.entries(state.record).reduce((accEntry, [key, value]) => {
    // if value is object, step to value
    if (!Array.isArray(value) && typeof value === "object") {
      console.log("is object", value);
      const stateObject = { record: value };

      if (tablet.filename === "export_tags-export2_tag.csv")
        console.log("down one step", base, stateObject);

      const iii = step(tablet, stateObject, trait, thing).record;

      const res = {
        ...accEntry,
        record: {
          ...accEntry.record,
          [key]: iii,
        },
        // next: true,
      };

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

    // console.log("omitting", accEntry.record[key], "for", values);

    const { [key]: omitted, ...recordWithoutKey } = accEntry.record;

    // if (
    //   tablet.filename === "export_tags-export1_tag.csv" &&
    //   key === "export1_tag"
    // )
    //   console.log("reduce values", accEntry, key, values, recordWithoutKey);

    const foo = values.reduce(
      (accItem, item) => {
        if (!Array.isArray(item) && typeof item === "object") {
          // console.log("is object", value);
          const itemNew = step(tablet, { record: item }, trait, thing).record;

          const itemsPartial =
            accItem.record[key] === undefined ? [] : accItem.record[key];

          const itemsOld = Array.isArray(itemsPartial)
            ? itemsPartial
            : [itemsPartial];

          const itemsNew =
            itemsOld.length > 0 ? [...itemsOld, itemNew] : itemNew;

          return {
            ...accItem,
            record: {
              ...accItem.record,
              [key]: itemsNew,
            },
            // next: true,
          };
        }

        // otherwise if value is literal, match against tablet and line
        // if key is trait branch, match trait value against value
        if (key === tablet.trait) {
          if (tablet.hasConstraints) {
            // assume that trait is not regex but one literal value
            // should be safe here because of the strategy
            // TODO what about trait that is regex but not value?
            // TODO use tablet.regexes
            const failsConstraints = item !== trait;

            const itemsPartial =
              accItem.record[key] === undefined ? [] : accItem.record[key];

            const itemsOld = Array.isArray(itemsPartial)
              ? itemsPartial
              : [itemsPartial];

            const itemsNew = itemsOld.length > 0 ? [...itemsOld, item] : item;

            if (failsConstraints)
              return {
                ...accItem,
                record: { ...accItem.record, [key]: itemsNew },
              };
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

              const itemsNew = itemsOld.length > 0 ? [...itemsOld, item] : item;

              const res = {
                ...accItem,
                record: {
                  ...accItem.record,
                  [key]: itemsNew,
                  [leaf]: leafValue,
                },
                next: true,
              };

              return res;
            }
            // assume that trait here is always trunk of thing
            const trunk = key;

            // assume that trait is literal in state.record
            const trunkValue = item;

            // assume that thing is a leaf

            // const trunkObject = {
            //   _: trunk,
            //   [trunk]: trunkValue,
            //   [leaf]: thing,
            // };

            // return trunkObject;
            // }

            // assume that thing is a leaf
            // const leaf = tablet.thing;

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

            return {
              ...accItem,
              record: {
                ...accItem.record,
                [trunk]: itemsNew,
              },
              next: true,
            };
          }
        }

        const itemsPartial =
          accItem.record[key] === undefined ? [] : accItem.record[key];

        // if (tablet.filename === "export_tags-export1_tag.csv")
        // console.log("itemsPartial", accItem, itemsPartial);

        const itemsOld = Array.isArray(itemsPartial)
          ? itemsPartial
          : [itemsPartial];

        const itemsNew = itemsOld.length > 0 ? [...itemsOld, item] : item;

        // if (tablet.filename === "export_tags-export1_tag.csv")
        //   console.log("itemsNew", itemsNew);

        return {
          ...accItem,
          record: { ...accItem.record, [key]: itemsNew },
        };
      },
      { ...state, record: recordWithoutKey },
    );

    // if (tablet.filename === "export_tags-export1_tag.csv")
    //   console.log("foo", base, key, value, foo);

    return { ...accEntry, ...foo };

    // TODO can values length be 0?
    //return {
    //  ...accEntry,
    //  record: {
    //    ...accEntry.record,
    //    ...valuesPartial,
    //    // [key]: valuesNew.length === 1 ? valuesNew[0] : valuesNew,
    //  },
    //  next: true,
    //};
  }, state);

  // if (tablet.filename === "export_tags-export1_tag.csv")
  //   console.log("bar", base, thing, bar);

  return bar;
}
