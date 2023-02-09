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
  test.only('queries name1', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    const query = new Query({ searchParams, ...callbackOriginal });
    return query.run().then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name2 with out-of-order schema', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    callback.fetch = (path) => mocks.metadirUnordered[path];

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.fetch = (path) => mocks.metadirArray[path];

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });
});

describe('queryMetadir ripgrep', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    async function grepCLI(contentFile, patternFile) {
      const contentFilePath = '/tmp/content';

      const patternFilePath = '/tmp/pattern';

      await fs.promises.writeFile(contentFilePath, contentFile);

      await fs.promises.writeFile(patternFilePath, patternFile);

      let output = '';

      try {
        const { stdout, stderr } = await promisify(exec)(
          'export PATH=$PATH:~/.nix-profile/bin/; '
            + `rg -f ${patternFilePath} ${contentFilePath}`,
        );

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
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2001)]);
    });
  });

  test('queries name2', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name2');

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2002)]);
    });
  });

  test('queries name3', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name3');

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entry2003Unedited)]);
    });
  });

  test('queries name1 with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('actname', 'name1');

    callback.fetch = (path) => mocks.metadirArray[path];

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });

  test('queries export1_key with array of tags', () => {
    const searchParams = new URLSearchParams();

    searchParams.set('export1_key', 'longkey2');

    callback.fetch = (path) => mocks.metadirArray[path];

    return queryMetadir({ searchParams, callback }).then((data) => {
      expect(data).toStrictEqual([sortObject(mocks.entryArray)]);
    });
  });
});

describe('queryOptions', () => {
  beforeEach(() => {
    callback = { ...callbackOriginal };

    callback.fetch = async (path) => mocks.metadirAdded[path];

    callback.grep = grepJS;
  });

  test('queries name', () => queryOptions('actname', callback).then((data) => {
    expect(data).toStrictEqual(mocks.optionsActname);
  }));

  test('queries date', () => queryOptions('actdate', callback).then((data) => {
    expect(data).toStrictEqual(mocks.optionsActdate);
  }));

  test('queries actname with grep', () => queryOptions('actname', callback, true).then((data) => {
    expect(data).toStrictEqual(mocks.optionsActnameGrep);
  }));

  test('queries actdate with grep', () => queryOptions('actdate', callback, true).then((data) => {
    expect(data).toStrictEqual(mocks.optionsActdateGrep);
  }));

  test('queries sayname with grep', () => queryOptions('sayname', callback, true).then((data) => {
    expect(data).toStrictEqual(mocks.optionsSaynameGrep);
  }));

  test('queries saydate with grep', () => queryOptions('saydate', callback, true).then((data) => {
    expect(data).toStrictEqual(mocks.optionsSaydateGrep);
  }));

  test('queries object', async () => {
    callback.fetch = async (path) => mocks.metadirArray[path];

    const data = await queryOptions('export1_tag', callback, true);

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

    callback.write = writeFileMock;

    callback.fetch = async (path) => editedFiles[path];

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

    callback.fetch = (path) => editedFilesCustom[path];

    callback.write = (path, contents) => { editedFilesCustom[path] = contents; };

    return editEntry(mocks.entryAdded, callback)
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirEmptyAdded);
      });
  });

  test('adds entry with random uuid', () => {
    callback.random = crypto.randomUUID;

    return editEntry(mocks.entryAdded, callback)
      .then(() => {
        expect(editedFiles).not.toStrictEqual(mocks.metadirAdded);
      });
  });

  test('falls back to random UUID if callback is not specified', () => {
    delete callback.random;

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

    callback.write = writeFileMock;

    callback.fetch = async (path) => editedFiles[path];

    counter = 0;
  });

  test('adds entry with array', () => editEntry(mocks.entryArrayAdded, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirArrayAdded);
    }));

  test('adds entry with array to empty metadir', () => {
    callback.random = crypto.randomUUID;

    const editedFilesCustom = { ...mocks.metadirArrayEmpty };

    callback.fetch = (path) => editedFilesCustom[path];

    callback.write = (path, contents) => { editedFilesCustom[path] = contents; };

    return editEntry(mocks.entryArray, callback)
      .then(() => {
        expect(editedFilesCustom).toStrictEqual(mocks.metadirArray);
      });
  });

  test('adds array item to entry', () => editEntry(mocks.entryAddedArrayItem, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirAddedArrayItem);
    }));

  test('edits array item', () => editEntry(mocks.entryEditedArrayItem, callback)
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

    callback.write = writeFileMock;
  });

  test('deletes entry', () => deleteEntry(mocks.entry2003Unedited.UUID, callback)
    .then(() => {
      expect(editedFiles).toStrictEqual(mocks.metadirDeleted);
    }));
});
