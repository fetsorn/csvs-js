/* eslint-disable no-console */
import {
  describe, beforeEach, expect, test,
} from '@jest/globals';
import { TextEncoder, TextDecoder, promisify } from 'util';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import {
  Query, editEntry, deleteEntry,
} from '../src/index';
import { grepPolyfill as grepJS } from '../src/polyfill';
import mocks from './mocks';

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
  readFile: (path) => mocks.metadirDefault[path],
  randomUUID: () => {
    counter += 1;

    // backwards compatibility with old tests
    if (counter === 1) {
      return '5ff1e403-da6e-430d-891f-89aa46b968bf';
    }

    return counter;
  },
};

describe('queryMetadir no ripgrep', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };
  });

  test('queries name1', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name2 with out-of-order schema', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    callback.readFile = (path) => mocks.metadirUnordered[path];

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.readFile = (path) => mocks.metadirArray[path];

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });
});

describe('queryMetadir ripgrep', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    async function grepCLI(contentFile, patternFile) {
      const contentFilePath = `/tmp/${crypto.randomUUID()}`;

      const patternFilePath = `/tmp/${crypto.randomUUID()}`;

      await fs.promises.writeFile(contentFilePath, contentFile);

      await fs.promises.writeFile(patternFilePath, patternFile);

      let output = '';

      try {
        const { stdout, stderr } = await promisify(exec)(
          `rg -f ${patternFilePath} ${contentFilePath}`,
        );

        if (stderr) {
          console.log('grep cli failed', stderr);
        } else {
          output = stdout;
        }
      } catch (e) {
        console.log('grep returned empty', e, contentFile, patternFile);
      }

      await fs.promises.unlink(contentFilePath);

      await fs.promises.unlink(patternFilePath);

      return output;
    }

    callback.grep = grepCLI;
  });

  test('queries name1', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.readFile = (path) => mocks.metadirArray[path];

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries export1_key with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('export1_key', 'longkey2');

    callback.readFile = (path) => mocks.metadirArray[path];

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });
});

describe('queryOptions', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.readFile = async (path) => mocks.metadirAdded[path];

    callback.grep = grepJS;
  });

  test('queries name', () => (new Query({ base: 'actname', ...callback })).run().then((data) => {
    expect(data.map((obj) => obj.actname)).toStrictEqual(mocks.optionsActname);
  }));

  test('queries date', () => (new Query({ base: 'actdate', ...callback })).run().then((data) => {
    expect(data.map((obj) => obj.actdate)).toStrictEqual(mocks.optionsActdate);
  }));

  test('queries sayname with grep', () => (new Query({ base: 'sayname', ...callback })).run().then((data) => {
    expect(data.map((obj) => obj.sayname)).toStrictEqual(mocks.optionsSaynameGrep);
  }));

  test('queries saydate with grep', () => (new Query({ base: 'saydate', ...callback })).run().then((data) => {
    expect(data.map((obj) => obj.saydate)).toStrictEqual(mocks.optionsSaydateGrep);
  }));

  test('queries object', async () => {
    callback.readFile = async (path) => mocks.metadirArray[path];

    const query = new Query({ base: 'export1_tag', ...callback });

    const data = await query.run();

    expect(data).toStrictEqual(mocks.optionsExport1Tag);
  });
});

describe('editEntry', () => {
  let editedFiles;

  beforeEach(() => {
    callback = { ...callbackOriginal };

    editedFiles = { ...mocks.metadirDefault };

    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }

    callback.writeFile = writeFileMock;

    callback.readFile = async (path) => editedFiles[path];

    counter = 0;
  });

  test('does nothing on no change', () => editEntry(mocks.entry2001, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDefault);
    }));

  test('edits entry', () => editEntry(mocks.entry2003Edited, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEdited);
    }));

  test('adds entry', () => editEntry(mocks.entryAdded, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAdded);
    }));

  test('adds entry when metadir files are empty', () => {
    const editedFilesCustom = { ...mocks.metadirEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return editEntry(mocks.entryAdded, callback)
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirEmptyAdded);
      });
  });

  test('adds entry with random uuid', () => {
    callback.randomUUID = crypto.randomUUID;

    return editEntry(mocks.entryAdded, callback)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });

  test('falls back to random UUID if callback is not specified', () => {
    delete callback.randomUUID;

    return editEntry(mocks.entryAdded, callback)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });
});

describe('editEntry, arrays', () => {
  let editedFiles;

  beforeEach(() => {
    callback = { ...callbackOriginal };

    editedFiles = { ...mocks.metadirArray };

    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }

    callback.writeFile = writeFileMock;

    callback.readFile = async (path) => editedFiles[path];

    counter = 0;
  });

  test('adds entry with array', () => editEntry(mocks.entryArrayAdded, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirArrayAdded);
    }));

  test('adds entry with array to empty metadir', () => {
    callback.randomUUID = crypto.randomUUID;

    const editedFilesCustom = { ...mocks.metadirArrayEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return editEntry(mocks.entryArray, callback)
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirArray);
      });
  });

  test('adds array item to entry', () => editEntry(mocks.entryAddedArrayItem, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAddedArrayItem);
    }));

  test.skip('edits array item', () => editEntry(mocks.entryEditedArrayItem, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEditedArrayItem);
    }));

  test('removes array item', () => editEntry(mocks.entryDeletedArrayItem, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeletedArrayItem);
    }));
});

describe('deleteEntry', () => {
  let editedFiles;

  beforeEach(() => {
    callback = { ...callbackOriginal };

    editedFiles = { ...mocks.metadirDefault };

    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }

    callback.writeFile = writeFileMock;
  });

  test('deletes entry', () => deleteEntry(mocks.entry2003Unedited.UUID, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeleted);
    }));
});
