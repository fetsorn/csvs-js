function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => {
      obj[key] = a[key]
      return obj
    },
    {}
  )
}

function callback(mocks) {
  return { fetch: (path) => mocks.filesMock[path] }
}

function expect(received, expected) {
  JSON.stringify(received) == JSON.stringify(expected)
    ? console.log("V")
    : console.log("X, expected ", expected, ", got ", received)
}

async function testQueryMetadir1(csvs, mocks) {
  console.log('queries name1')
  var searchParams = new URLSearchParams()
  searchParams.set('hostname', 'name1')
  let data = await csvs.queryMetadir(searchParams, callback(mocks), true)
  expect(data.map(sortObject), [sortObject(mocks.event1)])
}

async function testQueryMetadir2(csvs, mocks) {
  console.log('queries name2')
  var searchParams = new URLSearchParams()
  searchParams.set('hostname', 'name2')
  let data = await csvs.queryMetadir(searchParams, callback(mocks), true)
  expect(data.map(sortObject), [sortObject(mocks.event2)])
}

async function testQueryMetadir3(csvs, mocks) {
  console.log('queries name3')
  var searchParams = new URLSearchParams()
  searchParams.set('hostname', 'name3')
  let data = await csvs.queryMetadir(searchParams, callback(mocks), true)
  expect(data.map(sortObject), [sortObject(mocks.event3)])
}

async function testQueryMetadirFalse(csvs, mocks) {
  console.log('queries false')
  var searchParams = new URLSearchParams()
  searchParams.set('hostname', 'false')
  let data = await csvs.queryMetadir(searchParams, callback(mocks), true)
  expect(data.map(sortObject),[])
}

async function testQueryMetadirWildcard(csvs, mocks) {
  console.log('queries regexp')
  var searchParams = new URLSearchParams()
  searchParams.set('hostname', 'name.*')
  let data = await csvs.queryMetadir(searchParams, callback(mocks), true)
  expect(data.map(sortObject),[
    sortObject(mocks.event1),
    sortObject(mocks.event2),
    sortObject(mocks.event3)
  ])
}

async function testQueryMetadirRecurse(csvs, mocks) {
  console.log('queries moddate')
  var searchParams = new URLSearchParams()
  searchParams.set('moddate', '2001-01-01')
  let data = await csvs.queryMetadir(searchParams, callback(mocks), true)
  expect(data.map(sortObject),[
    sortObject(mocks.event1)
  ])
}

async function testQueryMetadirRecurseWildcard(csvs, mocks) {
  console.log('queries moddate wildcard')
  var searchParams = new URLSearchParams()
  searchParams.set('moddate', '.*-01-01')
  let data = await csvs.queryMetadir(searchParams, callback(mocks), true)
  expect(data.map(sortObject),[
    sortObject(mocks.event1),
    sortObject(mocks.event2)
  ])
}

async function testQueryMetadir(csvs, mocks) {
  console.log('queryMetadir')

  await testQueryMetadir1(csvs, mocks)
  await testQueryMetadir2(csvs, mocks)
  await testQueryMetadir3(csvs, mocks)
  await testQueryMetadirFalse(csvs, mocks)
  await testQueryMetadirWildcard(csvs, mocks)
  await testQueryMetadirRecurse(csvs, mocks)
  await testQueryMetadirRecurseWildcard(csvs, mocks)
}

async function test(csvs, mocks) {
  await testQueryMetadir(csvs, mocks)
}
