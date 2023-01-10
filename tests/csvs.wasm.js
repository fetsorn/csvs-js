import * as csvs from '../src/index.js';
import mocks from './mockCSV.js';
import init, { grep } from '../node_modules/@fetsorn/wasm-grep/pkg/web/index.js';

function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => {
      obj[key] = a[key];
      return obj;
    },
    {}
  );
}

const callback = {
  fetch: (path) => mocks.filesMock[path],
  grep: grep
};

await init();

function expect(received, expected) {
  JSON.stringify(received) == JSON.stringify(expected)
    ? console.log('V')
    : console.log('X, expected ', expected, ', got ', received);
}

async function testQueryMetadir1() {
  console.log('queries name1');
  var searchParams = new URLSearchParams();
  searchParams.set('actname', 'name1');
  let data = await csvs.queryMetadir(searchParams, callback);
  expect(data.map(sortObject), [sortObject(mocks.event1)]);
}

async function testQueryMetadir2() {
  console.log('queries name2');
  var searchParams = new URLSearchParams();
  searchParams.set('actname', 'name2');
  let data = await csvs.queryMetadir(searchParams, callback);
  expect(data.map(sortObject), [sortObject(mocks.event2)]);
}

async function testQueryMetadir3() {
  console.log('queries name3');
  var searchParams = new URLSearchParams();
  searchParams.set('actname', 'name3');
  let data = await csvs.queryMetadir(searchParams, callback);
  expect(data.map(sortObject), [sortObject(mocks.event3)]);
}

async function testQueryMetadirFalse() {
  console.log('queries false');
  var searchParams = new URLSearchParams();
  searchParams.set('actname', 'false');
  let data = await csvs.queryMetadir(searchParams, callback);
  expect(data.map(sortObject),[]);
}

async function testQueryMetadirWildcard() {
  console.log('queries regexp');
  var searchParams = new URLSearchParams();
  searchParams.set('actname', 'name.*');
  let data = await csvs.queryMetadir(searchParams, callback);
  expect(data.map(sortObject),[
    sortObject(mocks.event1),
    sortObject(mocks.event2),
    sortObject(mocks.event3)
  ]);
}

async function testQueryMetadirRecurse() {
  console.log('queries moddate');
  var searchParams = new URLSearchParams();
  searchParams.set('moddate', '2001-01-01');
  let data = await csvs.queryMetadir(searchParams, callback);
  expect(data.map(sortObject),[
    sortObject(mocks.event1)
  ]);
}

async function testQueryMetadirRecurseWildcard() {
  console.log('queries moddate wildcard');
  var searchParams = new URLSearchParams();
  searchParams.set('moddate', '.*-01-01');
  let data;
  try {
    data = await csvs.queryMetadir(searchParams, callback);
    data = data.map(sortObject);
  } catch(e) {
    console.log(e);
  }
  expect(data,[
    sortObject(mocks.event1),
    sortObject(mocks.event2)
  ]);
}

async function testQueryMetadirTwoQueries() {
  console.log('queries moddate wildcard');
  var searchParams = new URLSearchParams();
  searchParams.set('actname', 'name.*');
  searchParams.set('actdate', '2001-01-01');
  let data;
  try {
    data = await csvs.queryMetadir(searchParams, callback);
    data = data.map(sortObject);
  } catch(e) {
    console.log(e);
  }
  expect(data,[
    sortObject(mocks.event1)
  ]);
}

export async function test() {
  console.log('queryMetadir');

  await testQueryMetadir1();
  await testQueryMetadir2();
  await testQueryMetadir3();
  await testQueryMetadirFalse();
  await testQueryMetadirWildcard();
  await testQueryMetadirRecurse();
  await testQueryMetadirRecurseWildcard();
  await testQueryMetadirTwoQueries();
}
