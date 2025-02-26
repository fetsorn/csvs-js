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
    name: "options name",
    query: { _: "actname" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsActname,
  },
  {
    name: "options date",
    query: { _: "actdate" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsActdate,
  },
  {
    name: "options sayname with grep",
    query: { _: "sayname" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsSayname,
  },
  {
    name: "options saydate with grep",
    query: { _: "saydate" },
    initial: mocks.datasetAdded,
    expected: mocks.optionsSaydate,
  },
  {
    name: "options object",
    query: { _: "export1_tag" },
    initial: mocks.datasetArray,
    expected: mocks.optionsExport1Tag,
  },
  {
    name: "options object free from trunk",
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
  {
    name: "finds value with semicolon",
    query: { _: "event", event: "event1" },
    initial: mocks.datasetSemicolon,
    expected: [mocks.recordSemicolon],
  },
  {
    name: "multiple roots",
    query: { _: "datum", actname: "name1" },
    initial: mocks.datasetTwoRoots,
    expected: [mocks.record2001],
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
  {
    name: "schema does nothing",
    query: mocks.recordSchemaBig,
    initial: mocks.datasetSchemaBig,
    expected: mocks.datasetSchemaBig,
  },
];

export const testCasesInsert = [
  {
    name: "duplicates on no change",
    query: mocks.record2001,
    initial: mocks.datasetDefault,
    expected: mocks.datasetDuplicate,
  },
  {
    name: "adds attribute record",
    query: mocks.record2001Edited,
    initial: mocks.datasetDefault,
    expected: mocks.datasetDuplicateLeaf,
  },
  {
    name: "adds record",
    query: mocks.recordAdded,
    initial: mocks.datasetDefault,
    expected: mocks.datasetAdded,
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
  {
    name: "deletes to an empty dir",
    query: mocks.recordBaseIsTrait,
    initial: mocks.datasetDeletedLeaf,
    expected: mocks.datasetDeletedLeafEmpty,
  },
];

export const testCasesMow = [
  {
    name: "grain from simple event",
    initial: mocks.record2001,
    trunk: "datum",
    branch: "actdate",
    expected: [
      {
        _: "datum",
        datum: "value1",
        actdate: "2001-01-01",
      },
    ],
  },
  {
    name: "grain from array",
    initial: mocks.recordArray,
    trunk: "export1_tag",
    branch: "export1_channel",
    expected: [
      {
        _: "export1_tag",
        export1_tag:
          "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        export1_channel: "https://channel1.url",
      },
      {
        _: "export1_tag",
        export1_tag:
          "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77",
        export1_channel: "https://channel2.url",
      },
    ],
  },
  {
    name: "empty grain when trait has no leaf",
    initial: {
      _: "datum",
      export_tags: {
        _: "export_tags",
        export_tags:
        "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
        export1_tag: [
          {
            _: "export1_tag",
            export1_tag:
            "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77",
            export1_key: "longkey2",
          },
        ],
      },
    },
    trunk: "export1_tag",
    branch: "export1_channel",
    expected: [
      {
        _: "export1_tag",
        "export1_tag": "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77"
      },
    ],
  },
];

export const testCasesSow = [
  {
    name: "grain to a simple record",
    initial: mocks.record2001,
    grain: mocks.grain2001,
    trunk: "datum",
    branch: "saydate",
    expected: mocks.record2001Sow,
  },
  {
    name: "grain to array",
    initial: mocks.recordArray,
    grain: mocks.grainArray,
    trunk: "export_tags",
    branch: "export1_tag",
    expected: mocks.recordArraySow,
  },
  {
    name: "grain to array",
    initial: mocks.recordBaseIsTrait,
    grain: mocks.grainBaseIsTrait,
    trunk: "datum",
    branch: "filepath",
    expected: mocks.grainBaseIsTrait,
  },
];

export const testCasesToSchema = [
  {
    name: "empty record",
    initial: {},
    expected: {},
  },
  {
    name: "record without base",
    initial: { a: "b" },
    expected: {},
  },
  {
    name: "one leaf",
    initial: { _: "_", datum: "date" },
    expected: {
      datum: { trunks: [], leaves: [ "date" ] },
      date: { trunks: [ "datum" ], leaves: [] }
    },
  },
]
