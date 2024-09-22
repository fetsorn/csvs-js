/* eslint-disable no-console */
import { describe, expect, test } from "@jest/globals";
import {
  select,
  selectBaseKeys,
  buildRecord,
  update,
  deleteRecord,
} from "../src/index.js";
import { testCasesSelect, testCasesUpdate, testCasesDelete } from "./cases.js";

function sortObject(a) {
  return Object.keys(a)
    .sort()
    .reduce((obj, key) => ({ ...obj, [key]: a[key] }), {});
}

describe("select()", () => {
  testCasesSelect.forEach((testCase) => {
    test(testCase.name, () => {
      const fsNew = {
        readFileSync: (path) => testCase.initial[path],
      };

      return select(fsNew, "", testCase.query).then((data) => {
        const dataSorted = data
          .map(sortObject)
          .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));

        const expected = testCase.expected
          .map(sortObject)
          .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));

        // console.log(JSON.stringify(dataSorted, undefined, 2));

        expect(dataSorted).toStrictEqual(expected);
      });
    });
  });
});

describe("selectBaseKeys()", () => {
  testCasesSelect.forEach((testCase) => {
    test(testCase.name, async () => {
      const fsNew = {
        readFileSync: (path) => testCase.initial[path],
      };

      const baseRecords = await selectBaseKeys(fsNew, "", testCase.query);

      const records = await Promise.all(
        baseRecords.map((baseRecord) => buildRecord(fsNew, "", baseRecord)),
      );

      const dataSorted = records
        .map(sortObject)
        .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));

      const expected = testCase.expected
        .map(sortObject)
        .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe("update()", () => {
  testCasesUpdate.forEach((testCase) => {
    test(testCase.name, () => {
      let editedFiles = { ...testCase.initial };

      const fsNew = {
        readFileSync: (path) => editedFiles[path],
        writeFileSync: (path, contents) => {
          editedFiles[path] = contents;
        },
      };

      return update(fsNew, "", testCase.query).then(() => {
        expect(editedFiles).toStrictEqual(testCase.expected);
      });
    });
  });
});

describe("deleteRecord()", () => {
  testCasesDelete.forEach((testCase) => {
    test(testCase.name, () => {
      let editedFiles = { ...testCase.initial };

      const fsNew = {
        readFileSync: (path) => editedFiles[path],
        writeFileSync: (path, contents) => {
          editedFiles[path] = contents;
        },
      };

      return deleteRecord(fsNew, "", testCase.query).then(() => {
        expect(editedFiles).toStrictEqual(testCase.expected);
      });
    });
  });
});
