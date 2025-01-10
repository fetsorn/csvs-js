/* eslint-disable no-console */
import { describe, expect, test } from "@jest/globals";
import { join } from "path";
import nodefs from "fs";
import os from "os";
import {
  selectRecord,
  updateRecord,
  insertRecord,
  deleteRecord,
  toSchema,
  mow,
  sow,
} from "../src/index.js";
import {
  testCasesSelect,
  testCasesUpdate,
  testCasesInsert,
  testCasesDelete,
  testCasesMow,
  testCasesSow,
  testCasesToSchema,
} from "./cases.js";

function sortObject(a) {
  return Object.keys(a)
    .sort()
    .reduce((obj, key) => ({ ...obj, [key]: a[key] }), {});
}

function findpath(fs, base, loadname) {
  const loadpath = join(base, loadname);

  const loadtype = fs.statSync(loadpath);

  if (loadtype.isFile()) {
    return [loadname];
  } else if (loadtype.isDirectory()) {
    const filenames = fs.readdirSync(loadpath);

    const entries = filenames.map((filename) => {
      const filepath = join(loadname, filename);

      return findpath(fs, base, filepath);
    });

    return entries.flat();
  }
}

function loadContents(fs, loadname) {
  const base = "/";

  const paths = findpath(fs, base, loadname);

  const entries = paths.map((filename) => {
    const filepath = join(base, filename);

    const contents = fs.readFileSync(filepath, { encoding: "utf8" });

    const filenameRelative = filename.replace(new RegExp(`${loadname}/`), "");

    return [filenameRelative, contents];
  });

  return Object.fromEntries(entries);
}

function copy(_path, path) {
  const stats = nodefs.statSync(_path);

  if (!stats.isDirectory()) {
    const content = nodefs.readFileSync(_path, "utf8");

    nodefs.writeFileSync(path, content);

    return;
  }

  if (path != "/" && !nodefs.existsSync(path)) {
    nodefs.mkdirSync(path);
  }

  for (const file of nodefs.readdirSync(_path)) {
    copy(join(_path, file), join(path, file));
  }
}

describe("selectRecord()", () => {
  testCasesSelect.forEach((testCase) => {
    test(testCase.name, () => {
      return selectRecord({
        fs: nodefs,
        dir: testCase.initial,
        query: testCase.query,
      }).then((data) => {
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

describe("updateRecord()", () => {
  testCasesUpdate.forEach((testCase) => {
    test(testCase.name, () => {
      const tmpdir = nodefs.mkdtempSync(join(os.tmpdir(), "csvs-"));

      copy(testCase.initial, tmpdir);

      return updateRecord({
        fs: nodefs,
        dir: tmpdir,
        query: testCase.query,
      }).then(() => {
        expect(loadContents(nodefs, tmpdir)).toStrictEqual(
          loadContents(nodefs, testCase.expected),
        );
      });
    });
  });
});

describe("insertRecord()", () => {
  testCasesInsert.forEach((testCase) => {
    test(testCase.name, () => {
      const tmpdir = nodefs.mkdtempSync(join(os.tmpdir(), "csvs-"));

      copy(testCase.initial, tmpdir);

      return insertRecord({
        fs: nodefs,
        dir: tmpdir,
        query: testCase.query,
      }).then(() => {
        expect(loadContents(nodefs, tmpdir)).toStrictEqual(
          loadContents(nodefs, testCase.expected),
        );
      });
    });
  });
});

describe("deleteRecord()", () => {
  testCasesDelete.forEach((testCase) => {
    test(testCase.name, async () => {
      const tmpdir = nodefs.mkdtempSync(join(os.tmpdir(), "csvs-"));

      copy(testCase.initial, tmpdir);

      return deleteRecord({
        fs: nodefs,
        dir: tmpdir,
        query: testCase.query,
      }).then(() => {
        expect(loadContents(nodefs, tmpdir)).toStrictEqual(
          loadContents(nodefs, testCase.expected),
        );
      });
    });
  });
});

describe("mow()", () => {
  testCasesMow.forEach((testCase) => {
    test(testCase.name, async () => {
      const data = mow(testCase.initial, testCase.trunk, testCase.branch);

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

describe("sow()", () => {
  testCasesSow.forEach((testCase) => {
    test(testCase.name, async () => {
      const data = sow(
        testCase.initial,
        testCase.grain,
        testCase.trunk,
        testCase.branch,
      );

      const dataSorted = sortObject(data);

      const expected = sortObject(testCase.expected);

      // console.log(JSON.stringify(dataSorted, undefined, 2));

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe("toSchema()", () => {
  testCasesToSchema.forEach((testCase) => {
    test(testCase.name, async () => {
      const data = toSchema(testCase.initial);

      const dataSorted = sortObject(data);

      const expected = sortObject(testCase.expected);

      // console.log(JSON.stringify(dataSorted, undefined, 2));

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});
