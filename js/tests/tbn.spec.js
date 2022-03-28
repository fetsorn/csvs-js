import { queryMetadir, editEvent, deleteEvent } from '../src/tbn'
import { TextEncoder, TextDecoder } from 'util'
import crypto from 'crypto'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.crypto = {
  "randomUUID": crypto.randomUUID,
  "subtle": crypto.webcrypto.subtle
}

const dir = ""

const event1 = {
  "DATUM": "value1",
  "FILE_PATH": "path/to/1",
  "GUEST_DATE": "2001-01-01",
  "GUEST_NAME": "name1",
  "HOST_DATE": "2001-01-01",
  "HOST_NAME": "name1",
  "UUID": "8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704",
}

const event2 = {
  "DATUM": "value2",
  "FILE_PATH": "path/to/2",
  "GUEST_DATE": "2002-01-01",
  "GUEST_NAME": "name2",
  "HOST_DATE": "2002-01-01",
  "HOST_NAME": "name2",
  "UUID": "b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e",
}

const event3 = {
  "DATUM": "",
  "GUEST_DATE": "2003-01-01",
  "GUEST_NAME": "name3",
  "HOST_DATE": "2003-01-01",
  "HOST_NAME": "name3",
  "UUID": "f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265",
}

const event3new = {
  "DATUM": "value3",
  "FILE_PATH": "path/to/3",
  "GUEST_DATE": "2003-03-01",
  "GUEST_NAME": "name3",
  "HOST_DATE": "2003-01-01",
  "HOST_NAME": "name3",
  "UUID": "f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265",
}

const event4edit = {
  "DATUM": "value4",
  "GUEST_DATE": "2004-01-01",
  "GUEST_NAME": "name4",
  "HOST_DATE": "2004-01-01",
  "HOST_NAME": "name4",
}

const event4new = {
  "DATUM": "value4",
  "GUEST_DATE": "2004-01-01",
  "GUEST_NAME": "name4",
  "HOST_DATE": "2004-01-01",
  "HOST_NAME": "name4",
  "UUID": "1234",
}

var filesMock = {}

filesMock["metadir.json"] = `{
  "datum": {
    "type": "string",
    "label": "DATUM"
  },
  "hostdate": {
    "parent": "datum",
    "dir": "date",
    "type": "date",
    "label": "HOST_DATE"
  },
  "hostname": {
    "parent": "datum",
    "dir": "name",
    "label": "HOST_NAME"
  },
  "guestdate": {
    "parent": "datum",
    "dir": "date",
    "type": "date",
    "label": "GUEST_DATE"
  },
  "guestname": {
    "parent": "datum",
    "dir": "name",
    "label": "GUEST_NAME"
  },
  "tag": {
    "parent": "datum",
    "label": "TAG"
  },
  "filepath": {
    "parent": "datum",
    "label": "FILE_PATH",
    "type": "string"
  },
  "moddate": {
    "parent": "filepath",
    "dir": "date",
    "type": "date",
    "label": "GUEST_DATE"
  },
  "filetype": {
    "parent": "filepath",
    "label": "FILE_TYPE",
    "type": "string"
  },
  "filesize": {
    "parent": "filepath",
    "label": "FILE_SIZE"
  },
  "filehash": {
    "parent": "filepath",
    "label": "FILE_HASH",
    "type": "hash"
  },
  "pathrule": {
    "parent": "filepath",
    "type": "regex"
  }
}
`
filesMock["metadir/pairs/datum-guestname.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
`

filesMock["metadir/pairs/datum-hostname.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
`

filesMock["metadir/pairs/datum-guestdate.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
`

filesMock["metadir/pairs/datum-hostdate.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
`

filesMock["metadir/pairs/datum-filepath.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865
`

filesMock["metadir/props/name/index.csv"] = `9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1,name1
069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0,name2
b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690,name3
`

filesMock["metadir/props/date/index.csv"] = `4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc,2002-01-01
28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10,2003-01-01
`

filesMock["metadir/props/filepath/index.csv"] = `01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee,"path/to/1"
424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865,"path/to/2"
`

filesMock["metadir/props/datum/index.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,""
`

var filesMock3 = { ...filesMock }

filesMock3["metadir/props/datum/index.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,"value3"
`

filesMock3["metadir/props/filepath/index.csv"] = `01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee,"path/to/1"
424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865,"path/to/2"
1e8251d0c0cfed1944735156e09c934976ece0bf6b89f75e0ba16f372ec9aa05,"path/to/3"
`

filesMock3["metadir/pairs/datum-filepath.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,1e8251d0c0cfed1944735156e09c934976ece0bf6b89f75e0ba16f372ec9aa05
`

filesMock3["metadir/props/date/index.csv"] = `4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc,2002-01-01
28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10,2003-01-01
e11f6f7cedcf5fd13d31ba71df973a1d28f48c847331fa852c17f1d4f5fdc746,2003-03-01
`

filesMock3["metadir/pairs/datum-guestdate.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,e11f6f7cedcf5fd13d31ba71df973a1d28f48c847331fa852c17f1d4f5fdc746
`

var filesMock4 = { ...filesMock }

filesMock4["metadir/props/datum/index.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,""
c55581aff06024b65866642ed14f73a6f0e555821f3366fd8f10d74570fac920,"value4"
`

filesMock4["metadir/props/date/index.csv"] = `4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc,2002-01-01
28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10,2003-01-01
d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8,2004-01-01
`

filesMock4["metadir/pairs/datum-guestdate.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
c55581aff06024b65866642ed14f73a6f0e555821f3366fd8f10d74570fac920,d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8
`

filesMock4["metadir/pairs/datum-hostdate.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
c55581aff06024b65866642ed14f73a6f0e555821f3366fd8f10d74570fac920,d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8
`

filesMock4["metadir/props/name/index.csv"] = `9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1,name1
069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0,name2
b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690,name3
8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5,name4
`

filesMock4["metadir/pairs/datum-guestname.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
c55581aff06024b65866642ed14f73a6f0e555821f3366fd8f10d74570fac920,8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5
`

filesMock4["metadir/pairs/datum-hostname.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
c55581aff06024b65866642ed14f73a6f0e555821f3366fd8f10d74570fac920,8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5
`

var filesMockNo3 = { ...filesMock }

filesMockNo3["metadir/pairs/datum-guestname.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
`

filesMockNo3["metadir/pairs/datum-hostname.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
`

filesMockNo3["metadir/pairs/datum-guestdate.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
`

filesMockNo3["metadir/pairs/datum-hostdate.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
`

filesMockNo3["metadir/pairs/datum-filepath.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865
`

filesMockNo3["metadir/props/datum/index.csv"] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
`

jest.mock(('../src/tbn2'), () => {
  const originalModule = jest.requireActual('../src/tbn2');

  return {
    __esModule: true,
    ...originalModule,
    fetchDataMetadir: jest.fn((path) => filesMock[path]),
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

describe('queryMetadir', () => {
  test('queries name1', () => {
    var searchParams = new URLSearchParams()
    searchParams.set('hostname', 'name1')
    return queryMetadir(searchParams, {}).then(data => {
      expect(data).toStrictEqual([sortObject(event1)])
    })
  })
  test('queries name2', () => {
    var searchParams = new URLSearchParams()
    searchParams.set('hostname', 'name2')
    return queryMetadir(searchParams, {}).then(data => {
      expect(data).toStrictEqual([sortObject(event2)])
    })
  })
  test('queries name3', () => {
    var searchParams = new URLSearchParams()
    searchParams.set('hostname', 'name3')
    return queryMetadir(searchParams, {}).then(data => {
      expect(data).toStrictEqual([sortObject(event3)])
    })
  })
})

describe('editEvent', () => {

  let filesMockNew
  let pfs

  beforeEach(() => {
    filesMockNew = { ...filesMock }
    async function writeFileMock(path, contents, encoding) {
      filesMockNew[path] = contents
    }
    pfs = { "writeFile": jest.fn(writeFileMock) }
  })
  test('does nothing on no change', () => {
    return editEvent(event1, pfs, dir)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock)
      })
  })
  test('edits event', () => {
    return editEvent(event3new, pfs, dir)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock3)
      })
  })
  test('adds event', () => {
    return editEvent(event4edit, pfs, dir)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMock4)
      })
  })
})

describe('deleteEvent', () => {

  let filesMockNew
  let pfs

  beforeEach(() => {
    filesMockNew = { ...filesMock }
    async function writeFileMock(path, contents, encoding) {
      filesMockNew[path] = contents
    }
    pfs = { "writeFile": jest.fn(writeFileMock) }
  })

  test('deletes event', () => {
    return deleteEvent(event3.UUID, pfs, dir)
      .then(() => {
        expect(filesMockNew).toStrictEqual(filesMockNo3)
      })
  })
})
