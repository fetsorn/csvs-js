import { queryMetadir, queryOptions, editEvent, deleteEvent } from '../src/main'
import { TextEncoder, TextDecoder } from 'util'
import crypto from 'crypto'
const {
  event1,
  event2,
  event3,
  event3new,
  event4edit,
  event4new,
  filesEmpty,
  filesMock,
  filesMock3,
  filesMock4,
  filesMockNo3,
  filesMock5,
  filesMockNameUnique,
  filesMockDateUnique,
} = require('./mockCSV')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.crypto = {
  "randomUUID": crypto.randomUUID,
  "subtle": crypto.webcrypto.subtle
}

jest.mock(('../src/util'), () => {
  const originalModule = jest.requireActual('../src/util');

  return {
    __esModule: true,
    ...originalModule,
    digestRandom: jest.fn(() => "c55581aff06024b65866642ed14f73a6f0e555821f3366fd8f10d74570fac920")
  }
})

function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => {
      obj[key] = a[key]
      return obj
    },
    {}
  )
}

var callback = {
  fetch: (path) => filesMock[path],
}

describe('queryMetadir', () => {
  test('queries name1', () => {
    var searchParams = new URLSearchParams()
    searchParams.set('hostname', 'name1')
    return queryMetadir(searchParams, callback, false).then(data => {
      expect(data).toStrictEqual([sortObject(event1)])
    })
  })
  test('queries name2', () => {
    var searchParams = new URLSearchParams()
    searchParams.set('hostname', 'name2')
    return queryMetadir(searchParams, callback, false).then(data => {
      expect(data).toStrictEqual([sortObject(event2)])
    })
  })
  test('queries name3', () => {
    var searchParams = new URLSearchParams()
    searchParams.set('hostname', 'name3')
    return queryMetadir(searchParams, callback, false).then(data => {
      expect(data).toStrictEqual([sortObject(event3)])
    })
  })
})

describe('queryOptions', () => {
  test('queries hostname', () => {
    return queryOptions("hostname", callback).then(data => {
      expect(data).toStrictEqual(filesMockNameUnique)
    })
  })
  test('queries hostdate', () => {
    return queryOptions("hostdate", callback).then(data => {
      expect(data).toStrictEqual(filesMockDateUnique)
    })
  })
})

describe('editEvent', () => {

  let filesMockNew

  beforeEach(() => {
    filesMockNew = { ...filesMock }
    async function writeFileMock(path, contents) {
      filesMockNew[path] = contents
    }
    callback.write = writeFileMock
  })
  test('does nothing on no change', () => {
    return editEvent(event1, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock)
      })
  })
  test('edits event', () => {
    return editEvent(event3new, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock3)
      })
  })
  test('adds event', () => {
    return editEvent(event4edit, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock4)
      })
  })
  test('adds event when metadir files are empty', () => {
    let _filesMockNew = { ...filesEmpty }
    return editEvent(event4edit, {fetch: (path) => _filesMockNew[path],
                                  write: (path, contents) => {_filesMockNew[path] = contents}})
      .then(() => {
        expect(_filesMockNew).toStrictEqual(filesMock5)
      })
  })
})

describe('deleteEvent', () => {

  let filesMockNew

  beforeEach(() => {
    filesMockNew = { ...filesMock }
    async function writeFileMock(path, contents) {
      filesMockNew[path] = contents
    }
    callback.write = writeFileMock
  })

  test('deletes event', () => {
    return deleteEvent(event3.UUID, callback)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMockNo3)
      })
  })
})
