import { describe, beforeEach, expect, test } from '@jest/globals';
import { queryMetadir, queryOptions, editEntry, deleteEntry, grep as grepJS } from '../src/index';
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
    searchParams.set('actname', 'name1');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.entry1)]);
    });
  });
  test('queries name2', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('actname', 'name2');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.entry2)]);
    });
  });
  test('queries name3', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('actname', 'name3');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.entry3)]);
    });
  });
  test('queries name2 with out-of-order schema', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('actname', 'name2');
    callback.fetch = (path) => mocks.filesMockUnordered[path];
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.entry2)]);
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
    searchParams.set('actname', 'name1');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.entry1)]);
    });
  });
  test('queries name2', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('actname', 'name2');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.entry2)]);
    });
  });
  test('queries name3', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('actname', 'name3');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(mocks.entry3)]);
    });
  });
});

describe('queryOptions', () => {
  beforeEach(() => {
    callback.fetch = async (path) => mocks.filesMock4[path];
  });
  test('queries name', () => {
    return queryOptions('actname', callback).then(data => {
      expect(data).toStrictEqual(mocks.optionsActname);
    });
  });
  test('queries date', () => {
    return queryOptions('actdate', callback).then(data => {
      expect(data).toStrictEqual(mocks.optionsActdate);
    });
  });
  test('queries actname with grep', () => {
    return queryOptions('actname', callback, true).then(data => {
      expect(data).toStrictEqual(mocks.optionsActnameGrep);
    });
  });
  test('queries actdate with grep', () => {
    return queryOptions('actdate', callback, true).then(data => {
      expect(data).toStrictEqual(mocks.optionsActdateGrep);
    });
  });
  test('queries sayname with grep', () => {
    return queryOptions('sayname', callback, true).then(data => {
      expect(data).toStrictEqual(mocks.optionsSaynameGrep);
    });
  });
  test('queries saydate with grep', () => {
    return queryOptions('saydate', callback, true).then(data => {
      expect(data).toStrictEqual(mocks.optionsSaydateGrep);
    });
  });
});

describe('editEntry', () => {

  let editedFiles;

  beforeEach(() => {
    callback = { ..._callback };
    editedFiles = { ...mocks.filesMock };
    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }
    callback.write = writeFileMock;
    callback.fetch = async (path) => editedFiles[path];
  });

  test('does nothing on no change', () => {
    return editEntry(mocks.entry1, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMock);
      });
  });
  test('edits entry', () => {
    return editEntry(mocks.entry3edit, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMock3);
      });
  });
  test('adds entry', () => {
    return editEntry(mocks.entry4, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMock4);
      });
  });
  test('adds entry when metadir files are empty', () => {
    let _editedFiles = { ...mocks.filesEmpty };
    callback.fetch = (path) => _editedFiles[path];
    callback.write = (path, contents) => {_editedFiles[path] = contents;};
    return editEntry(mocks.entry4, callback)
      .then(() => {
        expect(_editedFiles).toStrictEqual(mocks.filesMock5);
      });
  });
  test('adds entry with random uuid', () => {
    callback.random = crypto.randomUUID;
    return editEntry(mocks.entry4, callback)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.filesMock4);
      });
  });
  test('falls back to random UUID if callback is not specified', () => {
    delete callback.random;
    return editEntry(mocks.entry4, callback)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.filesMock4);
      });
  });
});

describe('deleteEntry', () => {

  let editedFiles;

  beforeEach(() => {
    callback = { ..._callback };
    editedFiles = { ...mocks.filesMock };
    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }
    callback.write = writeFileMock;
  });

  test('deletes entry', () => {
    return deleteEntry(mocks.entry3.UUID, callback)
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.filesMockNo3);
      });
  });
});
