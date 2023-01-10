/* eslint-disable no-console */
/* eslint-disable import/extensions */
// eslint-disable-next-line import/no-relative-packages
import init, { grep } from '../node_modules/@fetsorn/wasm-grep/pkg/web/index.js';
import * as csvs from '../src/index.js';
import mocks from './mockCSV.js';

function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => ({ ...obj, [key]: a[key] }),
    {},
  );
}

const callback = {
  fetch: (path) => mocks.filesMock[path],
  grep,
};

await init();

function expect(received, expected) {
  if (JSON.stringify(received) === JSON.stringify(expected)) {
    console.log('V');
  } else {
    console.log('X, expected ', expected, ', got ', received);
  }
}

async function testQueryMetadir1() {
  console.log('queries name1');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name1');

  const data = await csvs.queryMetadir(searchParams, callback);

  expect(data.map(sortObject), [sortObject(mocks.entry1)]);
}

async function testQueryMetadir2() {
  console.log('queries name2');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name2');

  const data = await csvs.queryMetadir(searchParams, callback);

  expect(data.map(sortObject), [sortObject(mocks.entry2)]);
}

async function testQueryMetadir3() {
  console.log('queries name3');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name3');

  const data = await csvs.queryMetadir(searchParams, callback);

  expect(data.map(sortObject), [sortObject(mocks.entry3)]);
}

async function testQueryMetadirFalse() {
  console.log('queries false');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'false');

  const data = await csvs.queryMetadir(searchParams, callback);

  expect(data.map(sortObject), []);
}

async function testQueryMetadirWildcard() {
  console.log('queries regexp');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name.*');

  const data = await csvs.queryMetadir(searchParams, callback);

  expect(data.map(sortObject), [
    sortObject(mocks.entry1),
    sortObject(mocks.entry2),
    sortObject(mocks.entry3),
  ]);
}

async function testQueryMetadirRecurse() {
  console.log('queries moddate');

  const searchParams = new URLSearchParams();

  searchParams.set('moddate', '2001-01-01');

  const data = await csvs.queryMetadir(searchParams, callback);

  expect(data.map(sortObject), [
    sortObject(mocks.entry1),
  ]);
}

async function testQueryMetadirRecurseWildcard() {
  console.log('queries moddate wildcard');

  const searchParams = new URLSearchParams();

  searchParams.set('moddate', '.*-01-01');

  let data;

  try {
    data = await csvs.queryMetadir(searchParams, callback);

    data = data.map(sortObject);
  } catch (e) {
    console.log(e);
  }

  expect(data, [
    sortObject(mocks.entry1),
    sortObject(mocks.entry2),
  ]);
}

async function testQueryMetadirTwoQueries() {
  console.log('queries moddate wildcard');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name.*');

  searchParams.set('actdate', '2001-01-01');

  let data;

  try {
    data = await csvs.queryMetadir(searchParams, callback);

    data = data.map(sortObject);
  } catch (e) {
    console.log(e);
  }

  expect(data, [
    sortObject(mocks.entry1),
  ]);
}

export default async function test() {
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
