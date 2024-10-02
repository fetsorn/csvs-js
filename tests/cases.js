import { loadMocks } from "./mocks/index.js";

const mocks = loadMocks();

export const testCasesSelect = [
  {
    name: "name1",
    query: { _: "datum", actname: "name1" },
    initial: mocks.datasetDefault,
    expected: [mocks.record2001],
  },
  {
    name: "name2",
    query: { _: "datum", actname: "name2" },
    initial: mocks.datasetDefault,
    expected: [mocks.record2002],
  },
  {
    name: "name3 with empty string trunk value",
    query: { _: "datum", actname: "name3" },
    initial: mocks.datasetDefault,
    expected: [mocks.record2003Unedited],
  },
  {
    name: "name2 with out-of-order schema",
    query: { _: "datum", actname: "name2" },
    initial: mocks.datasetUnordered,
    expected: [mocks.record2002],
  },
  {
    name: "name1 with simple array",
    query: { _: "datum", actname: "name2" },
    initial: mocks.datasetArraySimple,
    expected: [mocks.recordArraySimple],
  },
  {
    name: "name1 with double array",
    query: { _: "datum", datum: "value" },
    initial: mocks.datasetArrayDouble,
    expected: mocks.recordsArrayDouble,
  },
  {
    name: "name1 with array of tags",
    query: { _: "datum", actname: "name1" },
    initial: mocks.datasetArray,
    expected: [mocks.recordArray],
  },
  {
    name: "value2 with array of tags",
    query: { _: "datum", datum: "value1" },
    initial: mocks.datasetArrayAdded,
    expected: [mocks.recordArray],
  },
  {
    name: "export1_key with array of tags",
    query: {
      _: "datum",
      export_tags: {
        _: "export_tags",
        export1_tag: { _: "export1_tag", export1_key: "longkey1" },
      },
    },
    initial: mocks.datasetArrayAdded,
    expected: [mocks.recordArray],
  },
  {
    name: "name1 with regexp",
    query: { _: "datum", actname: "name.*" },
    initial: mocks.datasetDefault,
    expected: [mocks.record2001, mocks.record2002, mocks.record2003Unedited],
  },
  {
    name: "no names with literal regexp",
    query: { _: "datum", actname: "name$" },
    initial: mocks.datasetDefault,
    expected: [],
  },
  {
    name: "no names with literal regexp",
    query: { _: "datum", actname: "^ame$" },
    initial: mocks.datasetDefault,
    expected: [],
  },
  {
    name: "moddate regex",
    query: { _: "datum", filepath: { _: "filepath", moddate: ".*-01-01" } },
    initial: mocks.datasetDefault,
    expected: [mocks.record2001, mocks.record2002],
  },
  {
    name: "two queries",
    query: { _: "datum", actname: "name.*", actdate: "2001-01-01" },
    initial: mocks.datasetDefault,
    expected: [mocks.record2001],
  },
  {
    name: "export1_tag with export1_key",
    query: { _: "export1_tag", export1_key: "longkey1" },
    initial: mocks.datasetArrayAdded,
    expected: [mocks.recordExport1Tag],
  },
  {
    name: "unlinked export1_tag with export1_key",
    query: { _: "export1_tag", export1_key: "longkey1" },
    initial: mocks.datasetDeletedArrayItem,
    expected: [mocks.recordExport1Tag],
  },
  {
    name: "name",
    query: { _: "actname", actname: "" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsActname,
  },
  {
    name: "date",
    query: { _: "actdate" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsActdate,
  },
  {
    name: "sayname with grep",
    query: { _: "sayname" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsSayname,
  },
  {
    name: "saydate with grep",
    query: { _: "saydate" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsSaydate,
  },
  {
    name: "object",
    query: { _: "export1_tag" },
    initial: mocks.datasetArray,
    expected: mocks.optionsExport1Tag,
  },
  {
    name: "object free from trunk",
    query: { _: "export1_tag" },
    initial: mocks.datasetArrayFree,
    expected: mocks.optionsExport1TagFree,
  },
  {
    name: "query schema relations",
    query: { _: "_" },
    initial: mocks.datasetDefault,
    expected: [mocks.recordSchema],
  },
  {
    name: "name1 with leader filepath",
    query: { _: "datum", __: "filepath", actname: "name1" },
    initial: mocks.datasetDefault,
    expected: [mocks.record2001Filepath],
  },
  {
    name: "name1 with array of literal values",
    query: { _: "datum", actname: "name1" },
    initial: mocks.datasetArrayLiteral,
    expected: [mocks.recordArrayLiteral],
  },
  {
    name: "fails a match on list of values",
    query: { _: "export_tags", export1_tag: "not" },
    initial: mocks.datasetArray,
    expected: [],
  },
  {
    name: "fails a match on list of values",
    query: { _: "event", actname: "not" },
    initial: mocks.datasetArrayLong,
    expected: [],
  },
];

export const testCasesUpdate = [
  {
    name: "does nothing on no change",
    query: mocks.record2001,
    initial: mocks.datasetDefault,
    expected: mocks.datasetDefault,
  },
  {
    name: "edits record",
    query: mocks.record2003Edited,
    initial: mocks.datasetDefault,
    expected: mocks.datasetEdited,
  },
  {
    name: "adds record",
    query: mocks.recordAdded,
    initial: mocks.datasetDefault,
    expected: mocks.datasetAdded,
  },
  {
    name: "adds record with random uuid",
    query: mocks.recordAdded,
    initial: mocks.datasetDefault,
    expected: mocks.datasetAdded,
  },
  {
    name: "falls back to random UUID if callback is not specified",
    query: mocks.recordAdded,
    initial: mocks.datasetDefault,
    expected: mocks.datasetAdded,
  },
  {
    name: "adds record with array",
    query: mocks.recordArrayAdded,
    initial: mocks.datasetArray,
    expected: mocks.datasetArrayAdded,
  },
  {
    name: "adds record with array to empty dataset",
    query: mocks.recordArray,
    initial: mocks.datasetArrayEmpty,
    expected: mocks.datasetArray,
  },
  {
    name: "adds array item to record",
    query: mocks.recordAddedArrayItem,
    initial: mocks.datasetArray,
    expected: mocks.datasetAddedArrayItem,
  },
  {
    name: "edits array item",
    query: mocks.recordEditedArrayItem,
    initial: mocks.datasetArray,
    expected: mocks.datasetEditedArrayItem,
  },
  {
    name: "removes array item",
    query: mocks.recordDeletedArrayItem,
    initial: mocks.datasetArray,
    expected: mocks.datasetDeletedArrayItem,
  },
  {
    name: "edits array item of type object",
    query: mocks.recordEditedArrayItemObject,
    initial: mocks.datasetArray,
    expected: mocks.datasetEditedArrayItemObject,
  },
  {
    name: "adds relation between two schema entities",
    query: mocks.recordSchema,
    initial: mocks.datasetSchemaNone,
    expected: mocks.datasetSchema,
  },
  {
    name: "adds schema with literal value",
    query: mocks.recordSchemaLiteral,
    initial: mocks.datasetSchemaNone,
    expected: mocks.datasetSchemaLiteral,
  },
  {
    name: "ignores record without base field",
    query: mocks.recordBaseNone,
    initial: mocks.datasetEmpty,
    expected: mocks.datasetEmpty,
  },
  {
    name: "ignores record with values that don't fit base",
    query: mocks.recordBaseIgnoredArrayItems,
    initial: mocks.datasetEmpty,
    expected: mocks.datasetEmpty,
  },
  {
    name: "adds record with array of literal values",
    query: mocks.recordArrayLiteral,
    initial: mocks.datasetDefault,
    expected: mocks.datasetArrayLiteral,
  },
  {
    name: "adds existing record with quotes",
    query: mocks.recordQuotes,
    initial: mocks.datasetQuotes,
    expected: mocks.datasetQuotes,
  },
  {
    name: "adds existing record with newline",
    query: mocks.recordNewline,
    initial: mocks.datasetNewline,
    expected: mocks.datasetNewline,
  },
  {
    name: "adds existing record with pipe",
    query: mocks.recordPipe,
    initial: mocks.datasetPipe,
    expected: mocks.datasetPipe,
  },
];

export const testCasesDelete = [
  {
    name: "deletes a record",
    query: mocks.record2003Unedited,
    initial: mocks.datasetDefault,
    expected: mocks.datasetDeleted,
  },
  {
    name: "deletes a record with a trunk",
    query: mocks.recordExport1Tag,
    initial: mocks.datasetArray,
    expected: mocks.datasetDeletedLeaf,
  },
];
