/* eslint-disable no-console */
import {
  describe, beforeEach, expect, test,
} from '@jest/globals';
import { TextEncoder, TextDecoder, promisify } from 'util';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import { CSVS } from '../src/index';
import { testCasesSelect, testCasesUpdate, testCasesDelete } from './cases.js';

// node polyfills for browser APIs
// used in csvs_js.digestMessage for hashes
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = {
  subtle: crypto.webcrypto.subtle,
  randomUUID: crypto.randomUUID,
};

function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => ({ ...obj, [key]: a[key] }),
    {},
  );
}

let callback;

let counter = 0;

const callbackOriginal = {
  randomUUID: () => {
    counter += 1;

    // backwards compatibility with old tests
    if (counter === 1) {
      return '5ff1e403-da6e-430d-891f-89aa46b968bf';
    }

    return `${counter}`;
  },
};

async function grepCLI(contentFile, patternFile, isInverse) {
  const contentFilePath = `/tmp/${crypto.randomUUID()}`;

  const patternFilePath = `/tmp/${crypto.randomUUID()}`;

  await fs.promises.writeFile(contentFilePath, contentFile);

  await fs.promises.writeFile(patternFilePath, patternFile);

  let output = '';

  try {
    const { stdout, stderr } = await promisify(exec)(
      `rg ${isInverse ? '-v' : ''} -f ${patternFilePath} ${contentFilePath}`,
    );

    if (stderr) {
      console.log('grep cli failed', stderr);
    } else {
      output = stdout;
    }
  } catch (e) {
    // console.log('grep returned empty', e, contentFile, patternFile);
  }

  await fs.promises.unlink(contentFilePath);

  await fs.promises.unlink(patternFilePath);

  return output;
}

describe('Query.select() no ripgrep 0.0.1', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });

  testCasesSelect("0.0.1").forEach((testCase) => {
    test(testCase.name, () => {
      const searchParams = new URLSearchParams(testCase.query);

      callback.readFile = (path) => testCase.initial[path];

      const client = new CSVS(callback)

      return client.select(searchParams).then((data) => {
        if (data[0].export_tags) {
          data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));
        }

        data.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

        const expected = testCase.expected
                                 .map(sortObject)
                                 .sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

        expect(data).toStrictEqual(expected)
      })
    })
  })
})

describe('Query.select() no ripgrep 0.0.2', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });

  testCasesSelect("0.0.2").forEach((testCase) => {
    test(testCase.name, () => {
      const searchParams = new URLSearchParams(testCase.query);

      callback.readFile = (path) => testCase.initial[path];

      const client = new CSVS(callback)

      return client.select(searchParams).then((data) => {
        const dataSorted = data.map(sortObject)
                               .sort((a, b) => (a[a._] < b[b._] ? -1 : 1))

        const expected = testCase.expected
                                 .map(sortObject)
                                 .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));

        expect(dataSorted).toStrictEqual(expected)
      })
    })
  })
})

describe('Query.select() ripgrep 0.0.1', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.grep = grepCLI;
  });

  testCasesSelect("0.0.1").forEach((testCase) => {
    test(testCase.name, () => {
      const searchParams = new URLSearchParams(testCase.query);

      callback.readFile = (path) => testCase.initial[path];

      const client = new CSVS(callback)

      return client.select(searchParams).then((data) => {
        if (data[0].export_tags) {
          data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));
        }

        data.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

        const expected = testCase.expected
                                 .map(sortObject)
                                 .sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

        expect(data).toStrictEqual(expected)
      })
    })
  })
})

describe('Query.select() ripgrep 0.0.2', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.grep = grepCLI;
  });

  testCasesSelect("0.0.2").forEach((testCase) => {
    test(testCase.name, () => {
      const searchParams = new URLSearchParams(testCase.query);

      callback.readFile = (path) => testCase.initial[path];

      const client = new CSVS(callback)

      return client.select(searchParams).then((data) => {
        const dataSorted = data.map(sortObject)
                               .sort((a, b) => (a[a._] < b[b._] ? -1 : 1))

        const expected = testCase.expected
                                 .map(sortObject)
                                 .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));

        expect(dataSorted).toStrictEqual(expected)
      })
    })
  })
})

describe('Query.selectBaseKeys() ripgrep 0.0.2', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.grep = grepCLI;
  });

  testCasesSelect("0.0.2").forEach((testCase) => {
    test(testCase.name, async () => {
      const searchParams = new URLSearchParams(testCase.query);

      callback.readFile = (path) => testCase.initial[path];

      const client = new CSVS(callback)

      const { base, baseKeys } = await client.selectBaseKeys(searchParams)

      const records = await Promise.all(baseKeys.map((baseKey) => client.buildRecord(base, baseKey)));

      const dataSorted = records.map(sortObject)
                                .sort((a, b) => (a[a._] < b[b._] ? -1 : 1))

      const expected = testCase.expected
                               .map(sortObject)
                               .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));

      expect(dataSorted).toStrictEqual(expected)
    })
  })
})

describe('Entry.update() 0.0.1', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });

  testCasesUpdate("0.0.1").forEach((testCase) => {
    test(testCase.name, () => {
      let editedFiles = { ...testCase.initial };

      async function writeFileMock(path, contents) {
        editedFiles[path] = contents;
      }

      callback.writeFile = writeFileMock;

      callback.readFile = async (path) => editedFiles[path];

      counter = 0;

      const client = new CSVS(callback)

      return client.update(testCase.query).then((data) => {
        expect(editedFiles).toStrictEqual(testCase.expected)
      })
    })
  })
})

describe.only('Entry.update() 0.0.2', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });

  testCasesUpdate("0.0.2").forEach((testCase) => {
    test(testCase.name, () => {
      let editedFiles = { ...testCase.initial };

      async function writeFileMock(path, contents) {
        editedFiles[path] = contents;
      }

      callback.writeFile = writeFileMock;

      callback.readFile = async (path) => editedFiles[path];

      counter = 0;

      const client = new CSVS(callback)

      return client.update(testCase.query).then((data) => {
        expect(editedFiles).toStrictEqual(testCase.expected)
      })
    })
  })
})

describe('Entry.delete() 0.0.1', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });

  testCasesDelete("0.0.1").forEach((testCase) => {
    test(testCase.name, () => {
      let editedFiles = { ...testCase.initial };

      async function writeFileMock(path, contents) {
        editedFiles[path] = contents;
      }

      callback.writeFile = writeFileMock;

      callback.readFile = async (path) => editedFiles[path];

      const client = new CSVS(callback)

      return client.delete(testCase.query).then((data) => {
        expect(editedFiles).toStrictEqual(testCase.expected)
      })
    })
  })
})

describe('Entry.delete() 0.0.2', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });
  testCasesDelete("0.0.2").forEach((testCase) => {
    test(testCase.name, () => {
      let editedFiles = { ...testCase.initial };

      async function writeFileMock(path, contents) {
        editedFiles[path] = contents;
      }

      callback.writeFile = writeFileMock;

      callback.readFile = async (path) => editedFiles[path];

      const client = new CSVS(callback)

      return client.delete(testCase.query).then((data) => {
        expect(editedFiles).toStrictEqual(testCase.expected)
      })
    })
  })
})
