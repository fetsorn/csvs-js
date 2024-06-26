import { loadMocks } from './mocks/index.js';

const mocks = loadMocks()

export const testCasesSelect = (version) => [
  {
    name: "queries name1",
    query: "?_=datum&actname=name1",
    initial: mocks[version].datasetDefault,
    expected: [mocks[version].record2001]
  },
  {
    name: "queries name2",
    query: "?_=datum&actname=name2",
    initial: mocks[version].datasetDefault,
    expected: [mocks[version].record2002]
  },
  {
    name: "queries name3",
    query: "?_=datum&actname=name3",
    initial: mocks[version].datasetDefault,
    expected: [mocks[version].record2003Unedited]
  },
  {
    name: "queries name2 with out-of-order schema",
    query: "?_=datum&actname=name2",
    initial: mocks[version].datasetUnordered,
    expected: [mocks[version].record2002]
  },
  {
    name: "queries name1 with array of tags",
    query: "?_=datum&actname=name1",
    initial: mocks[version].datasetArray,
    expected: [mocks[version].recordArray]
  },
  //{
  //  name: "queries name1 by UUID",
  //  query: "actname=9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1",
  //  initial: mocks[version].datasetDefault,
  //  expected: [mocks[version].record2001]
  //},
  {
    name: "queries value1 with array of tags",
    query: "?_=datum&datum=value1",
    initial: mocks[version].datasetArrayAdded,
    expected: [mocks[version].recordArray]
  },
  {
    name: "queries export1_key with array of tags",
    query: "?_=datum&export1_key=longkey1",
    initial: mocks[version].datasetArrayAdded,
    expected: [mocks[version].recordArray]
  },
  {
    name: "queries name1 with regexp",
    query: "?_=datum&actname=name.*",
    initial: mocks[version].datasetDefault,
    expected: [mocks[version].record2001,mocks[version].record2002,mocks[version].record2003Unedited]
  },
  {
    name: "queries moddate regex",
    query: "?_=datum&moddate=.*-01-01",
    initial: mocks[version].datasetDefault,
    expected: [mocks[version].record2001,mocks[version].record2002]
  },
  {
    name: "queries two queries",
    query: "?_=datum&actname=name.*&actdate=2001-01-01",
    initial: mocks[version].datasetDefault,
    expected: [mocks[version].record2001]
  },
  {
    name: "queries export1_tag with export1_key",
    query: "?_=export1_tag&export1_key=longkey1",
    initial: mocks[version].datasetArrayAdded,
    expected: [mocks[version].recordExport1Tag]
  },
  {
    name: "queries unlinked export1_tag with export1_key",
    query: "?_=export1_tag&export1_key=longkey1",
    initial: mocks[version].datasetDeletedArrayItem,
    expected: [mocks[version].recordExport1Tag]
  },
  {
    name: "queries name",
    query: "?_=actname",
    initial: mocks[version].datasetAdded,
    expected: mocks[version].optionsActname
  },
  {
    name: "queries date",
    query: "_=actdate",
    initial: mocks[version].datasetAdded,
    expected: mocks[version].optionsActdate
  },
  {
    name: "queries sayname with grep",
    query: "_=sayname",
    initial: mocks[version].datasetAdded,
    expected: mocks[version].optionsSayname
  },
  {
    name: "queries saydate with grep",
    query: "_=saydate",
    initial: mocks[version].datasetAdded,
    expected: mocks[version].optionsSaydate
  },
  {
    name: "queries object",
    query: "_=export1_tag",
    initial: mocks[version].datasetArray,
    expected: mocks[version].optionsExport1Tag
  },
  {
    name: "query schema relations",
    query: "_=_",
    initial: mocks[version].datasetDefault,
    expected: [mocks[version].recordSchema]
  },
]

export const testCasesUpdate = (version) => [
  {
    name: "does nothing on no change",
    query: mocks[version].record2001,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetDefault
  },
  {
    name: "edits record",
    query: mocks[version].record2003Edited,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetEdited
  },
  {
    name: "adds record",
    query: mocks[version].recordAdded,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetAdded
  },
  {
    name: "adds record with random uuid",
    query: mocks[version].recordAdded,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetAdded
  },
  {
    name: "falls back to random UUID if callback is not specified",
    query: mocks[version].recordAdded,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetAdded
  },
  {
    name: "adds record with array",
    query: mocks[version].recordArrayAdded,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetArrayAdded
  },
  {
    name: "adds record with array to empty dataset",
    query: mocks[version].recordArray,
    initial: mocks[version].datasetArrayEmpty,
    expected: mocks[version].datasetArray
  },
  {
    name: "adds array item to record",
    query: mocks[version].recordAddedArrayItem,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetAddedArrayItem
  },
  {
    name: "edits array item",
    query: mocks[version].recordEditedArrayItem,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetEditedArrayItem
  },
  {
    name: "removes array item",
    query: mocks[version].recordDeletedArrayItem,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetDeletedArrayItem
  },
  {
    name: "edits array item of type object",
    query: mocks[version].recordEditedArrayItemObject,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetEditedArrayItemObject
  },
  {
    name: "adds relation between two schema entities",
    query: mocks[version].recordSchema,
    initial: mocks[version].datasetSchemaNone,
    expected: mocks[version].datasetSchema
  },
  {
    name: "ignores record without base field",
    query: mocks[version].recordBaseNone,
    initial: mocks[version].datasetEmpty,
    expected: mocks[version].datasetEmpty
  },
  {
    name: "ignores record with values that don't fit base",
    query: mocks[version].recordBaseIgnoredArrayItems,
    initial: mocks[version].datasetEmpty,
    expected: mocks[version].datasetEmpty
  },
]

export const testCasesDelete = (version) => [
  {
    name: "deletes a record",
    query: mocks[version].record2003Unedited,
    initial: mocks[version].datasetDefault,
    expected: mocks[version].datasetDeleted
  },
  {
    name: "deletes a record with a trunk",
    query: mocks[version].recordExport1Tag,
    initial: mocks[version].datasetArray,
    expected: mocks[version].datasetDeletedLeaf
  }
]
