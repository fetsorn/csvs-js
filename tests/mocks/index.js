import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/* eslint-disable import/extensions */
// .js extensions are required for wasm tests
import records1 from './0.0.1/records.js';
import options1 from './0.0.1/options.js';
import records2 from './0.0.2/records.js';
import options2 from './0.0.2/options.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function findpath(loadname) {
  const loadpath = path.join(__dirname, loadname);

  const loadtype = fs.statSync(loadpath);

  if (loadtype.isFile()) {
    return [ loadname ] ;
  } else if (loadtype.isDirectory()) {
    const filenames = fs.readdirSync(loadpath);

    const entries = filenames.map((filename) => {
      const filepath = path.join(loadname, filename);

      return findpath(filepath);
    })

    return entries.flat();
  }
}

function loadContents(loadname) {
  const paths = findpath(loadname);

  const entries = paths.map((filename) => {
    const filepath = path.join(__dirname, filename)

    const contents = fs.readFileSync(filepath, {encoding: "utf8"});

    const filenameRelative = filename.replace(new RegExp(`${loadname}/`),"")

    return [filenameRelative, contents]
  })

  return Object.fromEntries(entries)
}

export function loadMocks() {
  return {
    "0.0.1": {
      datasetDefault: loadContents("0.0.1/default"),
      datasetEmpty: loadContents("0.0.1/empty"),
      datasetEdited: loadContents("0.0.1/edited"),
      datasetAdded: loadContents("0.0.1/added"),
      datasetDeleted: loadContents("0.0.1/deleted"),
      datasetEmptyAdded: loadContents("0.0.1/empty_added"),
      datasetUnordered: loadContents("0.0.1/unordered"),
      datasetArray: loadContents("0.0.1/array"),
      datasetArrayEmpty: loadContents("0.0.1/array_empty"),
      datasetArrayAdded: loadContents("0.0.1/array_added"),
      datasetAddedArrayItem: loadContents("0.0.1/added_array_item"),
      datasetEditedArrayItem: loadContents("0.0.1/edited_array_item"),
      datasetDeletedArrayItem: loadContents("0.0.1/deleted_array_item"),
      datasetEditedArrayItemObject: loadContents("0.0.1/edited_array_item_object"),
      datasetDeletedLeaf: loadContents("0.0.1/deleted_leaf"),
      ...options1,
      ...records1
    },
    "0.0.2": {
      datasetDefault: loadContents("0.0.2/default"),
      datasetEmpty: loadContents("0.0.2/empty"),
      datasetEdited: loadContents("0.0.2/edited"),
      datasetAdded: loadContents("0.0.2/added"),
      datasetDeleted: loadContents("0.0.2/deleted"),
      datasetEmptyAdded: loadContents("0.0.2/empty_added"),
      datasetUnordered: loadContents("0.0.2/unordered"),
      datasetArray: loadContents("0.0.2/array"),
      datasetArrayEmpty: loadContents("0.0.2/array_empty"),
      datasetArrayAdded: loadContents("0.0.2/array_added"),
      datasetAddedArrayItem: loadContents("0.0.2/added_array_item"),
      datasetEditedArrayItem: loadContents("0.0.2/edited_array_item"),
      datasetDeletedArrayItem: loadContents("0.0.2/deleted_array_item"),
      datasetEditedArrayItemObject: loadContents("0.0.2/edited_array_item_object"),
      datasetArrayLiteral: loadContents("0.0.2/array_literal"),
      datasetArrayFree: loadContents("0.0.2/array_free"),
      datasetDeletedLeaf: loadContents("0.0.2/deleted_leaf"),
      datasetSchema: loadContents("0.0.2/schema"),
      datasetSchemaNone: loadContents("0.0.2/schema_none"),
      datasetSchemaLiteral: loadContents("0.0.2/schema_literal"),
      ...options2,
      ...records2
    },
  }
}
