import path from "path";
import { fileURLToPath } from "url";
/* eslint-disable import/extensions */
// .js extensions are required for wasm tests
import records from "./records.js";
import options from "./options.js";
import schemas from "./schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function locate(loadname) {
  return path.join(__dirname, loadname);
}

export function loadMocks() {
  return {
    datasetDefault: locate("default"),
    datasetEmpty: locate("empty"),
    datasetEdited: locate("edited"),
    datasetAdded: locate("added"),
    datasetDeleted: locate("deleted"),
    datasetEmptyAdded: locate("empty_added"),
    datasetUnordered: locate("unordered"),
    datasetArray: locate("array"),
    datasetArraySimple: locate("array_simple"),
    datasetArrayDouble: locate("array_double"),
    datasetArrayEmpty: locate("array_empty"),
    datasetArrayAdded: locate("array_added"),
    datasetAddedArrayItem: locate("added_array_item"),
    datasetEditedArrayItem: locate("edited_array_item"),
    datasetDeletedArrayItem: locate("deleted_array_item"),
    datasetEditedArrayItemObject: locate("edited_array_item_object"),
    datasetArrayLiteral: locate("array_literal"),
    datasetArrayFree: locate("array_free"),
    datasetDeletedLeaf: locate("deleted_leaf"),
    datasetSchema: locate("schema"),
    datasetSchemaNone: locate("schema_none"),
    datasetSchemaLiteral: locate("schema_literal"),
    datasetQuotes: locate("quotes"),
    datasetNewline: locate("newline"),
    datasetPipe: locate("pipe"),
    datasetArrayLong: locate("array_long"),
    datasetSemicolon: locate("semicolon"),
    datasetDuplicate: locate("duplicate"),
    datasetDuplicateLeaf: locate("duplicate_leaf"),
    datasetTwoRoots: locate("two_roots"),
    ...options,
    ...records,
    ...schemas,
  };
}
