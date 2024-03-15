import { loadMocks } from './mocks/index.js';

const mocks = loadMocks()

export const testCasesSelect = [
  {
    name: "queries name1",
    query: "actname=name1",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001]
  },
  {
    name: "queries name2",
    query: "actname=name2",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2002]
  },
  {
    name: "queries name3",
    query: "actname=name3",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2003Unedited]
  },
  {
    name: "queries name2 with out-of-order schema",
    query: "actname=name2",
    initial: mocks.metadirUnordered,
    expected: [mocks.entry2002]
  },
  {
    name: "queries name1 with array of tags",
    query: "actname=name1",
    initial: mocks.metadirArray,
    expected: [mocks.entryArray]
  },
  {
    name: "queries name1 by UUID",
    query: "actname=9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001]
  },
  {
    name: "queries value2 with array of tags",
    query: "datum=value1",
    initial: mocks.metadirArrayAdded,
    expected: [mocks.entryArray]
  },
  {
    name: "queries export1_key with array of tags",
    query: "export1_key=longkey1",
    initial: mocks.metadirArrayAdded,
    expected: [mocks.entryArray]
  },
  {
    name: "queries name1 with regexp",
    query: "actname=name.*",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001,mocks.entry2002,mocks.entry2003Unedited]
  },
  {
    name: "queries moddate regex",
    query: "moddate=.*-01-01",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001,mocks.entry2002]
  },
  {
    name: "queries two queries",
    query: "actname=name.*&actdate=2001-01-01",
    initial: mocks.metadirDefault,
    expected: [mocks.entry2001]
  },
  {
    name: "queries export1_tag with export1_key",
    query: "_=export1_tag&export1_key=longkey1",
    initial: mocks.metadirArrayAdded,
    expected: [mocks.entryExport1Tag]
  },
  {
    name: "queries unlinked export1_tag with export1_key",
    query: "_=export1_tag&export1_key=longkey1",
    initial: mocks.metadirDeletedArrayItem,
    expected: [mocks.entryExport1Tag]
  },
  {
    name: "queries name",
    query: "_=actname",
    initial: mocks.metadirAdded,
    expected: mocks.optionsActname
  },
  {
    name: "queries date",
    query: "_=actdate",
    initial: mocks.metadirAdded,
    expected: mocks.optionsActdate
  },
  {
    name: "queries sayname with grep",
    query: "_=sayname",
    initial: mocks.metadirAdded,
    expected: mocks.optionsSayname
  },
  {
    name: "queries saydate with grep",
    query: "_=saydate",
    initial: mocks.metadirAdded,
    expected: mocks.optionsSaydate
  },
  {
    name: "queries object",
    query: "_=export1_tag",
    initial: mocks.metadirArray,
    expected: mocks.optionsExport1Tag
  },
]

export const testCasesUpdate = [
  {
    name: "does nothing on no change",
    query: mocks.entry2001,
    initial: mocks.metadirDefault,
    expected: mocks.metadirDefault
  },
  {
    name: "edits entry",
    query: mocks.entry2003Edited,
    initial: mocks.metadirDefault,
    expected: mocks.metadirEdited
  },
  {
    name: "adds entry",
    query: mocks.entryAdded,
    initial: mocks.metadirDefault,
    expected: mocks.metadirAdded
  },
  {
    name: "adds entry with random uuid",
    query: mocks.entryAdded,
    initial: mocks.metadirDefault,
    expected: mocks.metadirAdded
  },
  {
    name: "falls back to random UUID if callback is not specified",
    query: mocks.entryAdded,
    initial: mocks.metadirDefault,
    expected: mocks.metadirAdded
  },
  {
    name: "adds entry with array",
    query: mocks.entryArrayAdded,
    initial: mocks.metadirArray,
    expected: mocks.metadirArrayAdded
  },
  {
    name: "adds entry with array to empty metadir",
    query: mocks.entryArray,
    initial: mocks.metadirArrayEmpty,
    expected: mocks.metadirArray
  },
  {
    name: "adds array item to entry",
    query: mocks.entryAddedArrayItem,
    initial: mocks.metadirArray,
    expected: mocks.metadirAddedArrayItem
  },
  {
    name: "edits array item",
    query: mocks.entryEditedArrayItem,
    initial: mocks.metadirArray,
    expected: mocks.metadirEditedArrayItem
  },
  {
    name: "removes array item",
    query: mocks.entryDeletedArrayItem,
    initial: mocks.metadirArray,
    expected: mocks.metadirDeletedArrayItem
  },
  {
    name: "edits array item of type object",
    query: mocks.entryEditedArrayItemObject,
    initial: mocks.metadirArray,
    expected: mocks.metadirEditedArrayItemObject
  }
]

export const testCasesDelete = [
  {
    name: "deletes entry",
    query: mocks.entry2003Unedited,
    initial: mocks.metadirDefault,
    expected: mocks.metadirDeleted
  }
]
