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
  console.log("step", state, trait, thing);

  const { _: base } = state.record;

  // iterate over fields of state.record
  return Object.entries(state.record).reduce((acc, [key, value]) => {
    // if value is list of objects, map step to items
    // assume that the list is homogenous and has only objects
    if (Array.isArray(value) && typeof value[0] === "object") {
      // TODO if tablet.hasConstraints check constraints here
      const values = value.map((item) => {
        const stateItem = { record: item };

        // TODO if item is not object, match

        // if item is object, map to step?
        // TODO should we strip base values if trunk is object for matching?
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

    // otherwise if value is literal, match against tablet and line
    // if key is trait, match trait value against value
    if (key === tablet.trait) {
      if (tablet.hasConstraints) {
        // assume that trait is not regex but one literal value
        // should be safe here because of strategy
        // TODO what about trait that is regex but not value?
        const values = Array.isArray(value) ? value : [value];

        const failsConstraints = !values.includes(trait);

        if (failsConstraints) return acc;
      }

      const regexes = Array.isArray(value) ? value : [value];

      const isMatch =
        matchRegexes(
          regexes,
          // TODO replace this with .some()
          [trait],
        ).length > 0;

      // TODO how do i know here that trunk should become object?
      if (isMatch) {
        // if matched, set value of thing to thing value
        //
        //
        // if trait is not base, set trait to object
        // TODO what if trait is leaf and matches base?
        if (tablet.trait !== base && tablet.thing !== base) {
          // assume that trait here is always trunk of thing
          const trunk = tablet.trait;

          // assume that trait is literal in state.record
          const trunkValue = state.record[trunk];

          const trunkObject = {
            _: trunk,
            [trunk]: trunkValue,
            [tablet.thing]: thing,
          };

          return {
            ...acc,
            record: { ...acc.record, [trunk]: trunkObject },
            next: true,
          };
        }

        // assume that thing is a leaf
        const leaf = tablet.thing;

        // assume that existing leaf value is a literal
        // append here if value already exists
        const leafValue =
          state.record[leaf] === undefined
            ? thing
            : [state.record[leaf], thing];

        return {
          ...acc,
          record: { ...acc.record, [leaf]: leafValue },
          next: true,
        };
      }
    }

    return acc;
  }, state);
}
