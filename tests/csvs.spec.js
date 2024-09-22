/* eslint-disable no-console */
import { describe, expect, test } from "@jest/globals";
import { join } from "path";
import nodefs from "fs";
import os from "os";
import {
  select,
  selectBaseKeys,
  buildRecord,
  update,
  deleteRecord,
} from "../src/index.js";
import { testCasesSelect, testCasesUpdate, testCasesDelete } from "./cases.js";

const tmpDir = os.tmpdir();

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

describe("select()", () => {
  testCasesSelect.forEach((testCase) => {
    test(testCase.name, () => {
      return select(nodefs, testCase.initial, testCase.query).then((data) => {
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
      const baseRecords = await selectBaseKeys(
        nodefs,
        testCase.initial,
        testCase.query,
      );

      const records = await Promise.all(
        baseRecords.map((baseRecord) =>
          buildRecord(nodefs, testCase.initial, baseRecord),
        ),
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
      const tmpNew = nodefs.mkdtempSync("test");

      const tmpPath = join(tmpDir, tmpNew);

      copy(testCase.initial, tmpPath);

      return update(nodefs, tmpPath, testCase.query).then(() => {
        expect(loadContents(nodefs, tmpPath)).toStrictEqual(
          loadContents(nodefs, testCase.expected),
        );
      });
    });
  });
});

describe("deleteRecord()", () => {
  testCasesDelete.forEach((testCase) => {
    test(testCase.name, async () => {
      const tmpNew = nodefs.mkdtempSync("test");

      const tmpPath = join(tmpDir, tmpNew);

      copy(testCase.initial, tmpPath);

      return deleteRecord(nodefs, tmpPath, testCase.query).then(() => {
        expect(loadContents(nodefs, tmpPath)).toStrictEqual(
          loadContents(nodefs, testCase.expected),
        );
      });
    });
  });
});
