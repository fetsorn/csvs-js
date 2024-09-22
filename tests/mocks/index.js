import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
/* eslint-disable import/extensions */
// .js extensions are required for wasm tests
import records from "./records.js";
import options from "./options.js";
import schemas from "./schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findpath(loadname) {
  const loadpath = path.join(__dirname, loadname);

  const loadtype = fs.statSync(loadpath);

  if (loadtype.isFile()) {
    return [loadname];
  } else if (loadtype.isDirectory()) {
    const filenames = fs.readdirSync(loadpath);

    const entries = filenames.map((filename) => {
      const filepath = path.join(loadname, filename);

      return findpath(filepath);
    });

    return entries.flat();
  }
}

function loadContents(loadname) {
  const paths = findpath(loadname);

  const entries = paths.map((filename) => {
    const filepath = path.join(__dirname, filename);

    const contents = fs.readFileSync(filepath, { encoding: "utf8" });

    const filenameRelative = filename.replace(new RegExp(`${loadname}/`), "");

    return [filenameRelative, contents];
  });

  return Object.fromEntries(entries);
}

export function loadMocks() {
  return {
    datasetDefault: loadContents("default"),
    datasetEmpty: loadContents("empty"),
    datasetEdited: loadContents("edited"),
    datasetAdded: loadContents("added"),
    datasetDeleted: loadContents("deleted"),
    datasetEmptyAdded: loadContents("empty_added"),
    datasetUnordered: loadContents("unordered"),
    datasetArray: loadContents("array"),
    datasetArraySimple: loadContents("array_simple"),
    datasetArrayDouble: loadContents("array_double"),
    datasetArrayEmpty: loadContents("array_empty"),
    datasetArrayAdded: loadContents("array_added"),
    datasetAddedArrayItem: loadContents("added_array_item"),
    datasetEditedArrayItem: loadContents("edited_array_item"),
    datasetDeletedArrayItem: loadContents("deleted_array_item"),
    datasetEditedArrayItemObject: loadContents("edited_array_item_object"),
    datasetArrayLiteral: loadContents("array_literal"),
    datasetArrayFree: loadContents("array_free"),
    datasetDeletedLeaf: loadContents("deleted_leaf"),
    datasetSchema: loadContents("schema"),
    datasetSchemaNone: loadContents("schema_none"),
    datasetSchemaLiteral: loadContents("schema_literal"),
    ...options,
    ...records,
    ...schemas,
  };
}
