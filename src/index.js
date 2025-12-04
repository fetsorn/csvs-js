import {
  selectRecordStream,
  selectRecord,
  selectSchema,
} from "./select/index.js";
import { updateRecord, updateRecordStream } from "./update/index.js";
import { deleteRecord, deleteRecordStream } from "./delete/index.js";
import { insertRecord } from "./insert/index.js";
import {
  findCrown,
  toSchema,
  sortNestingAscending,
  sortNestingDescending,
} from "./schema.js";
import { mow, sow } from "./record.js";

export {
  selectRecordStream,
  selectRecord,
  selectSchema,
  updateRecord,
  updateRecordStream,
  insertRecord,
  deleteRecord,
  deleteRecordStream,
  findCrown,
  toSchema,
  sortNestingAscending,
  sortNestingDescending,
  mow,
  sow,
};

export default {
  selectRecordStream,
  selectRecord,
  selectSchema,
  updateRecord,
  updateRecordStream,
  insertRecord,
  deleteRecord,
  deleteRecordStream,
  findCrown,
  toSchema,
  sortNestingAscending,
  sortNestingDescending,
  mow,
  sow,
};
