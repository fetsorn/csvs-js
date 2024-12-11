import { URLSearchParams } from "node:url";

/**
 * This function is true when branch has no leaves
 * @name isTwig
 * @function
 * @param {object} schema - Dataset schema.
 * @param {object} record - An expanded record.
 * @returns {object} - A condensed record.
 */
export function isTwig(schema, branch) {
  return (
    Object.keys(schema).filter((b) => schema[b].trunk === branch).length === 0
  );
}

/**
 * This function condenses the data structure where possible
 * @name condense
 * @function
 * @param {object} schema - Dataset schema.
 * @param {object} record - An expanded record.
 * @returns {object} - A condensed record.
 */
export function condense(schema, record) {
  const base = record._;

  const entries = Object.entries(record);

  const entriesCondensed = entries
    .filter(([key]) => key !== "_" && key !== record._)
    .map(([branch, value]) => {
      if (Array.isArray(value)) {
        const itemsCondensed = isTwig(schema, branch)
          ? value.map((item) =>
              typeof item === "string" ? item : item[branch],
            )
          : value.map((item) => condense(schema, item));

        if (itemsCondensed.length === 0) {
          return undefined;
        }

        if (itemsCondensed.length === 1) {
          const valueCondensed = itemsCondensed[0];

          return [branch, valueCondensed];
        }

        return [branch, itemsCondensed];
      }

      if (typeof value === "object") {
        const valueCondensed = isTwig ? value[branch] : condense(schema, value);

        return [branch, valueCondensed];
      }

      if (typeof value === "string") {
        const valueCondensed = isTwig ? value : { _: branch, [branch]: value };

        return [branch, valueCondensed];
      }

      return undefined;
    });

  const recordCondensed = Object.fromEntries(entriesCondensed.filter(Boolean));

  return { ...recordCondensed, _: base, [base]: record[base] };
}

/**
 * This function expands the data structure
 * @name expand
 * @function
 * @param {object} record - A condensed record.
 * @returns {object} - An expanded record.
 */
export function expand(record) {
  const base = record._;

  const entries = Object.entries(record);

  // TODO: this is borked, fix
  const entriesExpanded = entries
    .filter(([key]) => key !== "_" && key !== record._)
    .map(([key, value]) => {
      const valueExpanded =
        typeof value === "string"
          ? [{ _: key, [key]: value }]
          : [value].flat().map(expand);

      return [key, valueExpanded];
    });

  const recordExpanded = Object.fromEntries(entriesExpanded);

  return { _: base, [base]: record[base], ...recordExpanded };
}

// add trunk field from schema record to branch records
// turn { _: _, branch1: [ branch2 ] }, [{ _: branch, branch: "branch2", task: "date" }]
// into [{ _: branch, branch: "branch2", trunk: "branch1", task: "date" }]
export function enrichBranchRecords(schemaRecord, metaRecords) {
  // [[branch1, [branch2]]]
  const schemaRelations = Object.entries(schemaRecord).filter(
    ([key]) => key !== "_",
  );

  // list of unique branches in the schema
  const branches = [...new Set(schemaRelations.flat(Infinity))];

  const branchRecords = branches.reduce((accBranch, branch) => {
    // check each key of schemaRecord, if array has branch, push trunk to metaRecord.trunk
    const trunkPartial = schemaRelations.reduce((accTrunk, [trunk, leaves]) => {
      if (leaves.includes(branch)) {
        // if old is array, [ ...old, new ]
        // if old is string, [ old, new ]
        // is old is undefined, [ new ]
        const trunks = accTrunk.trunk
          ? [accTrunk.trunk, trunk].flat(Infinity)
          : trunk;

        return { ...accTrunk, trunk: trunks };
      }

      return accTrunk;
    }, {});

    const branchPartial = { _: "branch", branch };

    const metaPartial =
      metaRecords.find((record) => record.branch === branch) ?? {};

    // if branch has no trunks, it's a trunk
    if (trunkPartial.trunk === undefined) {
      const rootRecord = { ...branchPartial, ...metaPartial };

      return [...accBranch, rootRecord];
    }

    const branchRecord = { ...branchPartial, ...metaPartial, ...trunkPartial };

    return [...accBranch, branchRecord];
  }, []);

  return branchRecords;
}

// extract schema record with trunks from branch records
// turn [{ _: branch, branch: "branch2", trunk: "branch1", task: "date" }]
// into [{ _: _, branch1: branch2 }, { _: branch, branch: "branch2", task: "date" }]
export function extractSchemaRecords(branchRecords) {
  const records = branchRecords.reduce(
    (acc, branchRecord) => {
      const { trunk, ...branchRecordOmitted } = branchRecord;

      const accLeaves = acc.schemaRecord[trunk] ?? [];

      const schemaRecord =
        trunk !== undefined
          ? {
              ...acc.schemaRecord,
              [trunk]: [branchRecord.branch, ...accLeaves],
            }
          : acc.schemaRecord;

      const metaRecords = [branchRecordOmitted, ...acc.metaRecords];

      return { schemaRecord, metaRecords };
    },
    { schemaRecord: { _: "_" }, metaRecords: [] },
  );

  return [records.schemaRecord, ...records.metaRecords];
}

/**
 * This returns an array of records from the dataset.
 * @name searchParamsToQuery
 * @export function
 * @param {URLSearchParams} urlSearchParams - search params from a query string.
 * @returns {Object}
 */
export function searchParamsToQuery(schema, searchParams) {
  // TODO rewrite to schemaRecord
  const urlSearchParams = new URLSearchParams(searchParams.toString());

  if (!urlSearchParams.has("_")) return {};

  const base = urlSearchParams.get("_");

  urlSearchParams.delete("_");

  urlSearchParams.delete("__");

  const entries = Array.from(urlSearchParams.entries());

  // TODO: if key is leaf, add it to value of trunk
  const query = entries.reduce(
    (acc, [branch, value]) => {
      // TODO: can handly only two levels of nesting, suffices for compatibility
      // push to [trunk]: { [key]: [ value ] }

      const trunk1 =
        schema[branch] !== undefined ? schema[branch].trunk : undefined;

      if (trunk1 === base || branch === base) {
        return { ...acc, [branch]: value };
      }

      const trunk2 =
        schema[trunk1] !== undefined ? schema[trunk1].trunk : undefined;

      if (trunk2 === base) {
        const trunk1Record = acc[trunk1] ?? { _: trunk1 };

        return { ...acc, [trunk1]: { ...trunk1Record, [branch]: value } };
      }

      const trunk3 =
        schema[trunk2] !== undefined ? schema[trunk2].trunk : undefined;

      if (trunk3 === base) {
        const trunk2Record = acc[trunk2] ?? { _: trunk2 };

        const trunk1Record = trunk2Record[trunk1] ?? { _: trunk1 };

        return {
          ...acc,
          [trunk2]: {
            ...trunk2Record,
            [trunk1]: {
              ...trunk1Record,
              [branch]: value,
            },
          },
        };
      }

      return acc;
    },
    { _: base },
  );

  return query;
}

// TODO what if trait-thing relation appears elsewhere deeper in the record?
function mowBaseIsThing(record, trait, thing) {
  const { _: base } = record;

  // assume base is single value
  const basePartial =
    record[base] === undefined ? {} : { [base]: record[base] };

  // take values
  const branchItems = Array.isArray(record[trait])
    ? record[trait]
    : [record[trait]].filter(Boolean);

  if (branchItems.length === 0) return [{ _: base, ...basePartial }];

  const grains = branchItems
    .map((branchItem) => {
      const isObject = typeof branchItem === "object";

      const branchValue = isObject ? branchItem[trait] : branchItem;

      if (branchValue === undefined) return undefined;

      return { _: base, ...basePartial, [trait]: branchValue };
    })
    .filter(Boolean);

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
    : [record[thing]].filter(Boolean);

  if (branchItems.length === 0) return [{ _: trait, [trait]: record[trait] }];

  const grains = branchItems.map((branchItem) => {
    const isObject = typeof branchItem === "object";

    const branchValue = isObject ? branchItem[thing] : branchItem;

    if (branchValue === undefined) return undefined;

    return { _: base, ...basePartial, [thing]: branchValue };
  }).filter(Boolean);

  return grains;
}

// TODO what if trait-thing relation appears elswhere deeper in the record?
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
  // console.log("mow", record, trait, thing)

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

  const baseValuePartial = baseValueOmitted === undefined
        ? {}
        : { [base]: baseValueOmitted };

  const recordNew = {
    _: base,
    ...baseValuePartial,
    ...Object.fromEntries(entriesNew),
  };

  return recordNew;
}

export function sow(record, grain, trait, thing) {
  // console.log("sow", record, grain);

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
