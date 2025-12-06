/* eslint-disable no-console */
import { describe, expect, test } from "@jest/globals";
import nodefs from "fs";
import { join } from "path";
import os from "os";
import {
  readDir,
  readTestCase,
  readRecord,
  loadContents,
  sortList,
  copy,
  sortObject,
} from "@fetsorn/csvs-test";
import {
  selectRecord,
  selectOption,
  updateRecord,
  insertRecord,
  deleteRecord,
  queryRecord,
  buildRecord,
  toSchema,
  mow,
  sow,
} from "../src/index.js";

describe("buildRecord()", () => {
  readTestCase("select").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readDir(testCase.initial),
        query: testCase.query.map(readRecord),
        expected: testCase.expected.map(readRecord),
      };

      const data = await buildRecord({
        fs: nodefs,
        dir: testCase.initial,
        query: testCase.query,
      });

      const dataSorted = [data];

      const expected = sortList(testCase.expected);

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe("queryRecord()", () => {
  readTestCase("select").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readDir(testCase.initial),
        query: testCase.query.map(readRecord),
        expected: testCase.expected.map(readRecord),
      };

      const data = await queryRecord({
        fs: nodefs,
        dir: testCase.initial,
        query: testCase.query,
      });

        console.log(data)

      const dataSorted = sortList(data);

      const expected = sortList(testCase.expected);

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe.only("selectOption()", () => {
  readTestCase("select").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readDir(testCase.initial),
        query: testCase.query.map(readRecord),
        expected: testCase.expected.map(readRecord),
      };

      const data = await selectOption({
        fs: nodefs,
        dir: testCase.initial,
        query: testCase.query,
      });

      const dataSorted = sortList(data);

      const expected = sortList(testCase.expected);

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe("selectRecord()", () => {
  readTestCase("select").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readDir(testCase.initial),
        query: testCase.query.map(readRecord),
        expected: testCase.expected.map(readRecord),
      };

      const data = await selectRecord({
        fs: nodefs,
        dir: testCase.initial,
        query: testCase.query,
      });

      const dataSorted = sortList(data);

      const expected = sortList(testCase.expected);

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe("updateRecord()", () => {
  readTestCase("update").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readDir(testCase.initial),
        query: testCase.query.map(readRecord),
        expected: readDir(testCase.expected),
      };

      const tmpdir = nodefs.mkdtempSync(join(os.tmpdir(), "csvs-"));

      copy(testCase.initial, tmpdir);

      await updateRecord({
        fs: nodefs,
        dir: tmpdir,
        query: testCase.query,
      });

      expect(loadContents(tmpdir)).toStrictEqual(
        loadContents(testCase.expected),
      );
    });
  });
});

describe("insertRecord()", () => {
  readTestCase("insert").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readDir(testCase.initial),
        query: testCase.query.map(readRecord),
        expected: readDir(testCase.expected),
      };

      const tmpdir = nodefs.mkdtempSync(join(os.tmpdir(), "csvs-"));

      copy(testCase.initial, tmpdir);

      await insertRecord({
        fs: nodefs,
        dir: tmpdir,
        query: testCase.query,
      });

      expect(loadContents(tmpdir)).toStrictEqual(
        loadContents(testCase.expected),
      );
    });
  });
});

describe("deleteRecord()", () => {
  readTestCase("delete").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readDir(testCase.initial),
        query: testCase.query.map(readRecord),
        expected: readDir(testCase.expected),
      };

      const tmpdir = nodefs.mkdtempSync(join(os.tmpdir(), "csvs-"));

      copy(testCase.initial, tmpdir);

      await deleteRecord({
        fs: nodefs,
        dir: tmpdir,
        query: testCase.query,
      });

      expect(loadContents(tmpdir)).toStrictEqual(
        loadContents(testCase.expected),
      );
    });
  });
});

describe("mow()", () => {
  readTestCase("mow").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readRecord(testCase.initial),
        trunk: testCase.trunk,
        branch: testCase.branch,
        expected: testCase.expected.map(readRecord),
      };

      const data = mow(testCase.initial, testCase.trunk, testCase.branch);

      const dataSorted = sortList(data);

      const expected = sortList(testCase.expected);

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe("sow()", () => {
  readTestCase("sow").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readRecord(testCase.initial),
        grain: readRecord(testCase.grain),
        trunk: testCase.trunk,
        branch: testCase.branch,
        expected: readRecord(testCase.expected),
      };

      const data = sow(
        testCase.initial,
        testCase.grain,
        testCase.trunk,
        testCase.branch,
      );

      const dataSorted = sortObject(data);

      const expected = sortObject(testCase.expected);

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});

describe("toSchema()", () => {
  readTestCase("to_schema").forEach((testCase) => {
    test(testCase.name, async () => {
      testCase = {
        initial: readRecord(testCase.initial),
        expected: readRecord(testCase.expected),
      };

      const data = toSchema(testCase.initial);

      const dataSorted = sortObject(data);

      const expected = sortObject(testCase.expected);

      expect(dataSorted).toStrictEqual(expected);
    });
  });
});
