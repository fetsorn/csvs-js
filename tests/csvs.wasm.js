/* eslint-disable no-console */
/* eslint-disable import/extensions */
// eslint-disable-next-line import/no-relative-packages
import init, { grep } from '../node_modules/@fetsorn/wasm-grep/pkg/web/index.js';
import * as csvs from '../src/index.js';
import mocks from './mocks/index.js';

function sortObject(a) {
  return Object.keys(a).sort().reduce(
    (obj, key) => ({ ...obj, [key]: a[key] }),
    {},
  );
}

const callback = {
  readFile: (path) => mocks.metadirDefault[path],
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

async function testQuery1() {
  console.log('queries name1');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name1');

  const data = await (new csvs.Query(callback).select(searchParams));

  expect(data.map(sortObject), [sortObject(mocks.entry2001)]);
}

async function testQuery2() {
  console.log('queries name2');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name2');

  const data = await (new csvs.Query(callback).select(searchParams));

  expect(data.map(sortObject), [sortObject(mocks.entry2002)]);
}

async function testQuery3() {
  console.log('queries name3');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name3');

  const data = await (new csvs.Query(callback).select(searchParams));

  expect(data.map(sortObject), [sortObject(mocks.entry2003Unedited)]);
}

async function testQueryFalse() {
  console.log('queries false');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'false');

  const data = await (new csvs.Query(callback).select(searchParams));

  expect(data.map(sortObject), []);
}

async function testQueryRegex() {
  console.log('queries regexp');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name.*');

  const data = await (new csvs.Query(callback).select(searchParams));

  const dataSorted = data.map(sortObject)
    .sort((a, b) => (a.saydate < b.saydate ? -1 : 1));

  expect(dataSorted, [
    sortObject(mocks.entry2001),
    sortObject(mocks.entry2002),
    sortObject(mocks.entry2003Unedited),
  ]);
}

async function testQueryLeaf() {
  console.log('queries moddate');

  const searchParams = new URLSearchParams();

  searchParams.set('moddate', '2001-01-01');

  const data = await (new csvs.Query(callback).select(searchParams));

  expect(data.map(sortObject), [
    sortObject(mocks.entry2001),
  ]);
}

async function testQueryLeafRegex() {
  console.log('queries moddate regex');

  const searchParams = new URLSearchParams();

  searchParams.set('moddate', '.*-01-01');

  let data;

  try {
    data = await (new csvs.Query(callback).select(searchParams));

    data = data.map(sortObject);
  } catch (e) {
    console.log(e);
  }

  expect(data, [
    sortObject(mocks.entry2001),
    sortObject(mocks.entry2002),
  ]);
}

async function testQueryTwoQueries() {
  console.log('queries two params');

  const searchParams = new URLSearchParams();

  searchParams.set('actname', 'name.*');

  searchParams.set('actdate', '2001-01-01');

  let data;

  try {
    data = await (new csvs.Query(callback).select(searchParams));

    data = data.map(sortObject);
  } catch (e) {
    console.log(e);
  }

  expect(data, [
    sortObject(mocks.entry2001),
  ]);
}

export default async function test() {
  console.log('Query.select()');

  await testQuery1();

  await testQuery2();

  await testQuery3();

  await testQueryFalse();

  await testQueryRegex();

  await testQueryLeaf();

  await testQueryLeafRegex();

  await testQueryTwoQueries();
}
