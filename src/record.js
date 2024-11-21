import { URLSearchParams } from "node:url";
import { isConnected } from "./schema.js";

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

/**
 * This collapses a nested record into a list of key-value relations
 * @name recordToRelations
 * @param {object} record - A dataset record.
 * @export function
 * @returns {string[]} - A list of tuples (relation, key, value)
 */
export function recordToRelations(schema, record) {
  // { _: trunk, trunk: key, leaf: value, leaf: [ value ], leaf: { _: leaf, leaf: value } }

  const base = record._;

  // skip if record doesn't have the base
  if (record._ === undefined) return [];

  const key = record[base] ?? "";

  const leaves = Object.keys(schema).filter(
    (branch) => schema[branch].trunk === base,
  );

  // [ "base-leaf.csv", "key", "value" ]
  const relations = leaves.reduce((accLeaf, leaf) => {
    // skip if record doesn't have the leaf
    if (record[leaf] === undefined) return accLeaf;

    const values = Array.isArray(record[leaf]) ? record[leaf] : [record[leaf]];

    const pair = `${base}-${leaf}.csv`;

    const relationsLeaf = values.reduce((accValue, value) => {
      if (typeof value === "string") {
        return [...accValue, [pair, key, value]];
      }

      const valueNested = value[leaf] ?? "";

      const relationsNested = recordToRelations(schema, value);

      return [...accValue, [pair, key, valueNested], ...relationsNested];
    }, []);

    return [...accLeaf, ...relationsLeaf];
  }, []);

  return relations;
}

/**
 * This collapses a nested record into a map of key-value relations
 * @name recordToRelations
 * @param {object} record - A dataset record.
 * @export function
 * @returns {object} - A map of key-value relations
 */
export function recordToRelationMap(schema, record) {
  const relations = recordToRelations(schema, record);

  const relationMap = relations.reduce((acc, [pair, key, value]) => {
    const pairMap = acc[pair] ?? {};

    const values = pairMap[key] ?? [];

    const accNew = {
      ...acc,
      [pair]: { ...pairMap, [key]: [value, ...values] },
    };

    return accNew;
  }, {});

  return relationMap;
}

// find all single-relation records for trunk-branch in the record
export function findSireres(schema, record, trunk, branch, filename) {
  if (filename === "filepath-filehash.csv")
    console.log(record, trunk, branch)

  if (filename === "wtf")
    console.log("wtf", record, trunk, branch)

  const base = record._;

  // assume base is single value
  const baseValue = record[base];

  // if base is trunk
  // and has a leaf that is branch
  const hasRelation = base === trunk && Object.hasOwn(record, branch)

  // take values
  const branchItems = Array.isArray(record[branch])
        ? record[branch]
        : [record[branch]].filter(Boolean);

  const sireresRecord = hasRelation ? branchItems.map((branchItem) => {
    const isObject = typeof branchItem === "object";

    const branchValue = isObject ? branchItem[branch] : branchItem;

    return { _: trunk, [trunk]: baseValue, [branch]: branchValue };
  }) : []

  const leaves = Object.keys(schema).filter(
    (b) => schema[b].trunk === base
  ).filter(
    (b) => b !== branch
  );

  // for each leaf
  const sireresLeaves = leaves.reduce((acc, leaf) => {
    // if trunk is connected to leaf
    if (isConnected(schema, leaf, trunk)) {
      const leafItems = Array.isArray(record[leaf])
            ? record[leaf]
            : [record[leaf]].filter(Boolean);

      const leafObjects = leafItems.map((leafItem) => {
        const isObject = typeof leafItem === "object";

        const leafObject = isObject ? leafItem : { _: leaf, [leaf]: leafItem }

        return leafObject
      });

      const leafLeaves = Object.keys(schema).filter((b) => schema[b].trunk === leaf && b === branch);

      // for each leaf item
      const sireresLeafItem = leafItems.reduce((accLeafItem, leafItem) => {
        // call findSireres on leaf item
        const sireresLeafItems = leafLeaves.reduce((accLeafLeaf, leafLeaf) => {
          const sireresLeafLeaf = filename === "filepath-filehash.csv"
                ? findSireres(schema, leafItem, leaf, leafLeaf, "wtf")
                : findSireres(schema, leafItem, leaf, leafLeaf);

          if (filename === "filepath-filehash.csv")
            console.log(accLeafLeaf, sireresLeafLeaf)

          return [...accLeafLeaf, ...sireresLeafLeaf];
        }, []);

        if (filename === "filepath-filehash.csv")
          console.log(sireresLeafItems)

        return [...accLeafItem, ...sireresLeafItems];
      }, []);

      if (filename === "filepath-filehash.csv")
        console.log(sireresLeafItem)

      return [...acc, ...sireresLeafItem]
    }

    return acc
  }, []);

  if (filename === "filepath-filehash.csv")
    console.log("end", sireresLeaves)

  if (filename === "wtf")
    console.log("wtf end", sireresRecord)

  return [...sireresRecord, ...sireresLeaves];
}
