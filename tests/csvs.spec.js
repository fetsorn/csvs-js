/* eslint-disable no-console */
import {
  describe, beforeEach, expect, test,
} from '@jest/globals';
import { TextEncoder, TextDecoder, promisify } from 'util';
import fs from 'fs';
import crypto from 'crypto';
import { exec } from 'child_process';
import {
  Query, Entry,
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

describe('Query.run() no ripgrep', () => {
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

describe('Query.run() ripgrep', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

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

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries value2 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('datum', 'value1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      // array is unordered, order for reproducible test
      data[0].export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries export1_key with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('export1_key', 'longkey1');

    callback.readFile = (path) => mocks.metadirArrayAdded[path];

    const query = new Query({ searchParams, ...callback });

    return query.run().then((data) => {
      // array is unordered, order for reproducible test
      data.forEach((item) => item.export_tags.items.sort((a, b) => (a.UUID < b.UUID ? -1 : 1)));

      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });
});

describe('Query.run() base', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.readFile = async (path) => mocks.metadirAdded[path];
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

describe('Entry.update()', () => {
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

  test('does nothing on no change', () => (new Entry({ entry: mocks.entry2001, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDefault);
    }));

  test('edits entry', () => (new Entry({ entry: mocks.entry2003Edited, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEdited);
    }));

  test('adds entry', () => (new Entry({ entry: mocks.entryAdded, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAdded);
    }));

  test('adds entry when metadir files are empty', () => {
    const editedFilesCustom = { ...mocks.metadirEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return (new Entry({ entry: mocks.entryAdded, ...callback })).update()
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirEmptyAdded);
      });
  });

  test.skip('adds entry with random uuid', () => {
    callback.randomUUID = crypto.randomUUID;

    return (new Entry({ entry: mocks.entryAdded, ...callback })).update()
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });

  test.skip('falls back to random UUID if callback is not specified', () => {
    delete callback.randomUUID;

    return (new Entry({ entry: mocks.entryAdded, ...callback })).update()
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });
});

describe.skip('Entry.update(), arrays', () => {
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

  test('adds entry with array', () => (new Entry({ entry: mocks.entryArrayAdded, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirArrayAdded);
    }));

  test('adds entry with array to empty metadir', () => {
    callback.randomUUID = crypto.randomUUID;

    const editedFilesCustom = { ...mocks.metadirArrayEmpty };

    callback.readFile = (path) => editedFilesCustom[path];

    callback.writeFile = (path, contents) => { editedFilesCustom[path] = contents; };

    return (new Entry({ entry: mocks.entryArray, ...callback })).update()
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirArray);
      });
  });

  test.skip('adds array item to entry', () => (new Entry({ entry: mocks.entryAddedArrayItem, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAddedArrayItem);
    }));

  test.skip('edits array item', () => (new Entry({ entry: mocks.entryEditedArrayItem, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirEditedArrayItem);
    }));

  test.skip('removes array item', () => (new Entry({ entry: mocks.entryDeletedArrayItem, ...callback })).update()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeletedArrayItem);
    }));
});

describe.skip('Entry.delete()', () => {
  let editedFiles;

  beforeEach(() => {
    callback = { ...callbackOriginal };

    editedFiles = { ...mocks.metadirDefault };

    async function writeFileMock(path, contents) {
      editedFiles[path] = contents;
    }

    callback.writeFile = writeFileMock;
  });

  test('deletes entry', () => (new Entry({ entry: mocks.entry2003Unedited, ...callback })).delete()
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeleted);
    }));

  test('deletes entry ripgrep', () => {
    callback.grep = grepCLI;

    const entry = new Entry({ entry: mocks.entry2003Unedited, ...callback });

    return entry.delete()
      .then(() => {
        expect(editedFiles).toStrictEqual(mocks.metadirDeleted);
      });
  });
});
