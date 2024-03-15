import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
/* eslint-disable import/extensions */
// .js extensions are required for wasm tests
import records from './0.0.1/records.js';
import options from './0.0.1/options.js';

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
    metadirDefault: loadContents("0.0.1/default"),
    metadirEmpty: loadContents("0.0.1/empty"),
    metadirEdited: loadContents("0.0.1/edited"),
    metadirAdded: loadContents("0.0.1/added"),
    metadirDeleted: loadContents("0.0.1/deleted"),
    metadirEmptyAdded: loadContents("0.0.1/empty_added"),
    metadirUnordered: loadContents("0.0.1/unordered"),
    metadirArray: loadContents("0.0.1/array"),
    metadirArrayEmpty: loadContents("0.0.1/array_empty"),
    metadirArrayAdded: loadContents("0.0.1/array_added"),
    metadirAddedArrayItem: loadContents("0.0.1/added_array_item"),
    metadirEditedArrayItem: loadContents("0.0.1/edited_array_item"),
    metadirDeletedArrayItem: loadContents("0.0.1/deleted_array_item"),
    metadirEditedArrayItemObject: loadContents("0.0.1/edited_array_item_object"),
    ...options,
    ...records
  }
}
