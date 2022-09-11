import { describe, beforeEach, expect, test } from '@jest/globals';
import { queryMetadir, queryOptions, editEvent, deleteEvent, grep as grepJS } from '../src/index';
import { TextEncoder, TextDecoder, promisify } from 'util';
import crypto from 'crypto';
import { exec } from 'child_process';
import mocks from './mockCSV';
const {
  event1,
  event2,
  event3,
  event3new,
  event4edit,
  // event4new,
  filesEmpty,
  filesMock,
  filesMock3,
  filesMock4,
  filesMockNo3,
  filesMock5,
  filesMockNameUnique,
  filesMockDateUnique,
} = mocks;

// node polyfills for browser APIs
// used in csvs_js.digestMessage for hashes
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = {
  'subtle': crypto.webcrypto.subtle
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
  fetch: (path) => filesMock[path],
  random: () => '5ff1e403-da6e-430d-891f-89aa46b968bf'
};

describe('queryMetadir no ripgrep', () => {

  beforeEach(() => {
    callback = { ..._callback};
    callback.grep = grepJS;
  });

  test('queries name1', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name1');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(event1)]);
    });
  });
  test('queries name2', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name2');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(event2)]);
    });
  });
  test('queries name3', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name3');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(event3)]);
    });
  });
});

describe('queryMetadir ripgrep', () => {

  beforeEach(() => {
    callback = { ..._callback};
    async function grepCLI(contentfile, patternfile) {
      const { stdout, stderr } = await promisify(exec)(
        'export PATH=$PATH:~/.nix-profile/bin/; ' +
          'printf "$patternfile" > /tmp/pattern; ' +
          'printf "$contentfile" | rg -f /tmp/pattern; ', {
          env: {
            contentfile,
            patternfile,
          }
        });
      if (stderr) {
        console.log(stderr);
        return '';
      } else {
        return stdout;
      }
    }
    callback.grep = grepCLI;
  });

  test('queries name1', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name1');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(event1)]);
    });
  });
  test('queries name2', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name2');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(event2)]);
    });
  });
  test('queries name3', () => {
    var searchParams = new URLSearchParams();
    searchParams.set('hostname', 'name3');
    return queryMetadir(searchParams, callback).then(data => {
      expect(data).toStrictEqual([sortObject(event3)]);
    });
  });
});

describe('queryOptions', () => {
  test('queries hostname', () => {
    return queryOptions('hostname', callback).then(data => {
      expect(data).toStrictEqual(filesMockNameUnique);
    });
  });
  test('queries hostdate', () => {
    return queryOptions('hostdate', callback).then(data => {
      expect(data).toStrictEqual(filesMockDateUnique);
    });
  });
});

describe('editEvent', () => {

  let filesMockNew;

  beforeEach(() => {
    callback = { ..._callback};
    filesMockNew = { ...filesMock };
    async function writeFileMock(path, contents) {
      filesMockNew[path] = contents;
    }
    callback.write = writeFileMock;
  });

  test('does nothing on no change', () => {
    return editEvent(event1, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock);
      });
  });
  test('edits event', () => {
    return editEvent(event3new, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock3);
      });
  });
  test('adds event', () => {
    return editEvent(event4edit, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock4);
      });
  });
  test('adds event when metadir files are empty', () => {
    let _filesMockNew = { ...filesEmpty };
    callback.fetch = (path) => _filesMockNew[path];
    callback.write = (path, contents) => {_filesMockNew[path] = contents;};
    return editEvent(event4edit, callback)
      .then(() => {
        expect(_filesMockNew).toStrictEqual(filesMock5);
      });
  });
  test('adds event with random uuid', () => {
    callback.random = crypto.randomUUID;
    return editEvent(event4edit, callback)
      .then(() => {
        expect(filesMockNew).not.toStrictEqual(filesMock4);
      });
  });
});

describe('deleteEvent', () => {

  let filesMockNew;

  beforeEach(() => {
    callback = { ..._callback};
    filesMockNew = { ...filesMock };
    async function writeFileMock(path, contents) {
      filesMockNew[path] = contents;
    }
    callback.write = writeFileMock;
  });

  test('deletes event', () => {
    return deleteEvent(event3.UUID, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMockNo3);
      });
  });
});
