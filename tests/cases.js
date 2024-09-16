import { loadMocks } from "./mocks/index.js";

const mocks = loadMocks();

export const testCasesSelect = (version) => [
  //{
  //  name: "queries name1",
  //  query: "?_=datum&actname=name1",
  //  initial: mocks[version].datasetDefault,
  //  expected: [mocks[version].record2001],
  //},
  //{
  //  name: "queries name2",
  //  query: "?_=datum&actname=name2",
  //  initial: mocks[version].datasetDefault,
  //  expected: [mocks[version].record2002],
  //},
  //{
  //  name: "queries name3 with empty string trunk value",
  //  query: "?_=datum&actname=name3",
  //  initial: mocks[version].datasetDefault,
  //  expected: [mocks[version].record2003Unedited],
  //},
  //{
  //  name: "queries name2 with out-of-order schema",
  //  query: "?_=datum&actname=name2",
  //  initial: mocks[version].datasetUnordered,
  //  expected: [mocks[version].record2002],
  //},
  //{
  //  name: "queries name1 with simple array",
  //  query: "?_=datum&actname=name2",
  //  initial: mocks[version].datasetArraySimple,
  //  expected: [mocks[version].recordArraySimple],
  //},
  //{
  //  name: "queries name1 with double array",
  //  query: "?_=datum&datum=value",
  //  initial: mocks[version].datasetArrayDouble,
  //  expected: mocks[version].recordsArrayDouble,
  //},
  {
    name: "queries name1 with array of tags",
    query: "?_=datum&actname=name1",
    initial: mocks[version].datasetArray,
    expected: [mocks[version].recordArray],
  },
  ////{
  ////  name: "queries name1 by UUID",
  ////  query: "actname=9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1",
  ////  initial: mocks[version].datasetDefault,
  ////  expected: [mocks[version].record2001]
  ////},
  //{
  //  name: "queries value2 with array of tags",
  //  query: "?_=datum&datum=value1",
  //  initial: mocks[version].datasetArrayAdded,
  //  expected: [mocks[version].recordArray],
  //},
  //{
  //  name: "queries export1_key with array of tags",
  //  query: "?_=datum&export1_key=longkey1",
  //  initial: mocks[version].datasetArrayAdded,
  //  expected: [mocks[version].recordArray],
  //},
  //{
  //  name: "queries name1 with regexp",
  //  query: "?_=datum&actname=name.*",
  //  initial: mocks[version].datasetDefault,
  //  expected: [
  //    mocks[version].record2001,
  //    mocks[version].record2002,
  //    mocks[version].record2003Unedited,
  //  ],
  //},
  // {
  //   name: "queries no names with literal regexp",
  //   query: "?_=datum&actname=name$",
  //   initial: mocks[version].datasetDefault,
  //   expected: []
  // },
  // {
  //   name: "queries no names with literal regexp",
  //   query: "?_=datum&actname=^ame$",
  //   initial: mocks[version].datasetDefault,
  //   expected: []
  // },
  // {
  //   name: "queries moddate regex",
  //   query: "?_=datum&moddate=.*-01-01",
  //   initial: mocks[version].datasetDefault,
  //   expected: [mocks[version].record2001,mocks[version].record2002]
  // },
  // {
  //   name: "queries two queries",
  //   query: "?_=datum&actname=name.*&actdate=2001-01-01",
  //   initial: mocks[version].datasetDefault,
  //   expected: [mocks[version].record2001]
  // },
  // {
  //   name: "queries export1_tag with export1_key",
  //   query: "?_=export1_tag&export1_key=longkey1",
  //   initial: mocks[version].datasetArrayAdded,
  //   expected: [mocks[version].recordExport1Tag]
  // },
  // {
  //   name: "queries unlinked export1_tag with export1_key",
  //   query: "?_=export1_tag&export1_key=longkey1",
  //   initial: mocks[version].datasetDeletedArrayItem,
  //   expected: [mocks[version].recordExport1Tag]
  // },
  // {
  //   name: "queries name",
  //   query: "?_=actname",
  //   initial: mocks[version].datasetAdded,
  //   expected: mocks[version].optionsActname
  // },
  // {
  //   name: "queries date",
  //   query: "_=actdate",
  //   initial: mocks[version].datasetAdded,
  //   expected: mocks[version].optionsActdate
  // },
  // {
  //   name: "queries sayname with grep",
  //   query: "_=sayname",
  //   initial: mocks[version].datasetAdded,
  //   expected: mocks[version].optionsSayname
  // },
  // {
  //   name: "queries saydate with grep",
  //   query: "_=saydate",
  //   initial: mocks[version].datasetAdded,
  //   expected: mocks[version].optionsSaydate
  // },
  // {
  //   name: "queries object",
  //   query: "_=export1_tag",
  //   initial: mocks[version].datasetArray,
  //   expected: mocks[version].optionsExport1Tag
  // },
  // {
  //   name: "queries object free from trunk",
  //   query: "_=export1_tag",
  //   initial: mocks[version].datasetArrayFree,
  //   expected: mocks[version].optionsExport1TagFree
  // },
  // {
  //   name: "query schema relations",
  //   query: "_=_",
  //   initial: mocks[version].datasetDefault,
  //   expected: [mocks[version].recordSchema]
  // },
  // {
  //   name: "queries name1 with leader filepath",
  //   query: "?_=datum&__=filepath&actname=name1",
  //   initial: mocks[version].datasetDefault,
  //   expected: [mocks[version].record2001Filepath]
  // },
  // {
  //   name: "queries name1 with array of literal values",
  //   query: "?_=datum&actname=name1",
  //   initial: mocks[version].datasetArrayLiteral,
  //   expected: [mocks[version].recordArrayLiteral]
  // },
];

export const testCasesUpdate = (version) => [
  {
    name: "does nothing on no change",
    query: mocks[version].record2001,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetDefault,
  },
  {
    name: "edits record",
    query: mocks[version].record2003Edited,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetEdited,
  },
  {
    name: "adds record",
    query: mocks[version].recordAdded,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetAdded,
  },
  {
    name: "adds record with random uuid",
    query: mocks[version].recordAdded,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetAdded,
  },
  {
    name: "falls back to random UUID if callback is not specified",
    query: mocks[version].recordAdded,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetAdded,
  },
  {
    name: "adds record with array",
    query: mocks[version].recordArrayAdded,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetArrayAdded,
  },
  {
    name: "adds record with array to empty dataset",
    query: mocks[version].recordArray,
    initial: mocks[version].datasetArrayEmpty,
    expected: mocks[version].datasetArray,
  },
  {
    name: "adds array item to record",
    query: mocks[version].recordAddedArrayItem,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetAddedArrayItem,
  },
  {
    name: "edits array item",
    query: mocks[version].recordEditedArrayItem,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetEditedArrayItem,
  },
  {
    name: "removes array item",
    query: mocks[version].recordDeletedArrayItem,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetDeletedArrayItem,
  },
  {
    name: "edits array item of type object",
    query: mocks[version].recordEditedArrayItemObject,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetEditedArrayItemObject,
  },
  {
    name: "adds relation between two schema entities",
    query: mocks[version].recordSchema,
    initial: mocks[version].datasetSchemaNone,
    expected: mocks[version].datasetSchema,
  },
  {
    name: "adds schema with literal value",
    query: mocks[version].recordSchemaLiteral,
    initial: mocks[version].datasetSchemaNone,
    expected: mocks[version].datasetSchemaLiteral,
  },
  {
    name: "ignores record without base field",
    query: mocks[version].recordBaseNone,
    initial: mocks[version].datasetEmpty,
    expected: mocks[version].datasetEmpty,
  },
  {
    name: "ignores record with values that don't fit base",
    query: mocks[version].recordBaseIgnoredArrayItems,
    initial: mocks[version].datasetEmpty,
    expected: mocks[version].datasetEmpty,
  },
  {
    name: "adds record with array of literal values",
    query: mocks[version].recordArrayLiteral,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetArrayLiteral,
  },
];

export const testCasesDelete = (version) => [
  {
    name: "deletes a record",
    query: mocks[version].record2003Unedited,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetDeleted,
  },
  {
    name: "deletes a record with a trunk",
    query: mocks[version].recordExport1Tag,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetDeletedLeaf,
  },
];

export const testCasesGetValue = () => [
  //{
  //  name: "gets actname",
  //  schema: mocks["0.0.2"].recordSchema,
  //  query: { _: "datum", __: "actname" },
  //  initial: mocks["0.0.2"].record2001,
  //  expected: "name1",
  //},
  //{
  //  name: "gets filepath",
  //  schema: mocks["0.0.2"].recordSchema,
  //  query: { _: "datum", __: "filepath" },
  //  initial: mocks["0.0.2"].record2001,
  //  expected: mocks["0.0.2"].record2001Filepath,
  //},
  //{
  //  name: "gets moddate",
  //  schema: mocks["0.0.2"].recordSchema,
  //  query: {
  //    _: "filepath",
  //    __: "moddate",
  //    filepath: "path/to/1",
  //  },
  //  initial: mocks["0.0.2"].record2001,
  //  expected: "2001-01-01",
  //},
  {
    name: "gets array item",
    schema: mocks["0.0.2"].recordSchemaArray,
    initial: mocks["0.0.2"].recordArray,
    query: {
      _: "datum",
      __: "export1_key",
      export_tags: {
        _: "export_tags",
        export1_tag: {
          _: "export1_tag",
          export1_tag:
            "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        },
      },
    },
    expected: "longkey1",
  },
];

export const testCasesSetValue = () => [
  {
    name: "sets actname",
    schema: mocks["0.0.2"].schemaDefault,
    initial: mocks["0.0.2"].record2001,
    trunk: "datum",
    branch: "actname",
    value: "name2",
    expected: mocks["0.0.2"].record2001Edited,
  },
];
