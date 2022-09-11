import { describe, beforeEach, expect, test } from '@jest/globals';
import { queryMetadir, queryOptions, editEvent, deleteEvent, grep as grepJS } from '../src/index';
import { TextEncoder, TextDecoder, promisify } from 'util';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import mocks from './mockCSV';

// node polyfills for browser APIs
// used in csvs_js.digestMessage for hashes
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = {
  'subtle': crypto.webcrypto.subtle,
  'randomUUID': crypto.randomUUID
};

function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => {
      obj[key] = a[key];
      return obj;
    },
    {}
  );
}

let callback;
const _callback = {
  fetch: (path) => mocks.filesMock[path],
  random: () => '5ff1e403-da6e-430d-891f-89aa46b968bf'
};

describe('queryMetadir no ripgrep', () => {

  beforeEach(() => {
    callback = { ..._callback };
    callback.grep = grepJS;
  });

  test('queries name1', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name1');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.event1)]);
    });
  });
  test('queries name2', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name2');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.event2)]);
    });
  });
  test('queries name3', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name3');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.event3)]);
    });
  });
  test('queries name2 with out-of-order schema', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name2');
    callback.fetch = (path) => mocks.filesMockUnordered[path];
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.event2)]);
    });
  });
});

describe('queryMetadir ripgrep', () => {

  beforeEach(() => {
    callback = { ..._callback };
    async function grepCLI(contentFile, patternFile) {
      const contentFilePath = '/tmp/content';
      const patternFilePath = '/tmp/pattern';

      await fs.promises.writeFile(contentFilePath, contentFile);
      await fs.promises.writeFile(patternFilePath, patternFile);

      let output = '';
      try {
        const { stdout, stderr } = await promisify(exec)(
          'export PATH=$PATH:~/.nix-profile/bin/; ' +
            `rg -f ${patternFilePath} ${contentFilePath}`);

        if (stderr) {
          console.log('grep cli failed');
        } else {
          output = stdout;
        }
      } catch {
        // console.log('grep returned empty');
      }

      await fs.promises.unlink(contentFilePath);
      await fs.promises.unlink(patternFilePath);

      return output;
    }
    callback.grep = grepCLI;
  });

  test('queries name1', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name1');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.event1)]);
    });
  });
  test('queries name2', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name2');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.event2)]);
    });
  });
  test('queries name3', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name3');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.event3)]);
    });
  });
});

describe('queryOptions', () => {
  test('queries hostname', () => {
    return queryOptions('hostname', callback).then(data => {
      expect(data).toStrictEqual(mocks.filesMockNameUnique);
    });
  });
  test('queries hostdate', () => {
    return queryOptions('hostdate', callback).then(data => {
      expect(data).toStrictEqual(mocks.filesMockDateUnique);
    });
  });
});

describe('editEvent', () => {

  let editedFiles;

  beforeEach(() => {
    callback = { ..._callback };
    editedFiles = { ...mocks.filesMock };
    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }
    callback.write = writeFileMock;
  });

  test('does nothing on no change', () => {
    return editEvent(mocks.event1, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMock);
      });
  });
  test('edits event', () => {
    return editEvent(mocks.event3new, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMock3);
      });
  });
  test('adds event', () => {
    return editEvent(mocks.event4edit, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMock4);
      });
  });
  test('adds event when metadir files are empty', () => {
    let _editedFiles = { ...mocks.filesEmpty };
    callback.fetch = (path) => _editedFiles[path];
    callback.write = (path, contents) => {_editedFiles[path] = contents;};
    return editEvent(mocks.event4edit, callback)
      .then(() => {
        expect(_editedFiles).toStrictEqual(mocks.filesMock5);
      });
  });
  test('adds event with random uuid', () => {
    callback.random = crypto.randomUUID;
    return editEvent(mocks.event4edit, callback)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.filesMock4);
      });
  });
  test('falls back to random UUID if callback is not specified', () => {
    delete callback.random;
    return editEvent(mocks.event4edit, callback)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.filesMock4);
      });
  });
});

describe('deleteEvent', () => {

  let editedFiles;

  beforeEach(() => {
    callback = { ..._callback };
    editedFiles = { ...mocks.filesMock };
    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }
    callback.write = writeFileMock;
  });

  test('deletes event', () => {
    return deleteEvent(mocks.event3.UUID, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMockNo3);
      });
  });
});
