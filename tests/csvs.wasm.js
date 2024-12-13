/* eslint-disable no-console */
/* eslint-disable import/extensions */
// eslint-disable-next-line import/no-relative-packages
import init, {
  grep,
} from "../node_modules/@fetsorn/wasm-grep/pkg/web/index.js";
import { CSVS } from "../src/index.js";

const metadir = {};

metadir["metadir.json"] = `{
  "datum": {
    "type": "string"
  },
  "actdate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date"
  },
  "actname": {
    "trunk": "datum",
    "dir": "name"
  },
  "saydate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date"
  },
  "sayname": {
    "trunk": "datum",
    "dir": "name"
  },
  "tag": {
    "trunk": "datum"
  },
  "filepath": {
    "trunk": "datum",
    "type": "string"
  },
  "moddate": {
    "trunk": "filepath",
    "dir": "date",
    "type": "date"
  },
  "filetype": {
    "trunk": "filepath",
    "type": "string"
  },
  "filesize": {
    "trunk": "filepath"
  },
  "filehash": {
    "trunk": "filepath",
    "type": "hash"
  },
  "pathrule": {
    "trunk": "filepath",
    "type": "regex"
  }
}`;

metadir["metadir/pairs/datum-sayname.csv"] =
  `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
`;

metadir["metadir/pairs/datum-actname.csv"] =
  `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
`;

metadir["metadir/pairs/datum-saydate.csv"] =
  `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
`;

metadir["metadir/pairs/datum-actdate.csv"] =
  `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
`;

metadir["metadir/pairs/datum-filepath.csv"] =
  `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865
`;

metadir["metadir/pairs/filepath-moddate.csv"] =
  `01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
`;

metadir["metadir/props/name/index.csv"] =
  `069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0,name2
9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1,name1
b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690,name3
`;

metadir["metadir/props/date/index.csv"] =
  `161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc,2002-01-01
28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10,2003-01-01
4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
`;

metadir["metadir/props/filepath/index.csv"] =
  `01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee,"path/to/1"
424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865,"path/to/2"
`;

metadir["metadir/props/datum/index.csv"] =
  `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,""
`;

const entry2001 = {
  _: "datum",
  datum: "value1",
  filepath: "path/to/1",
  saydate: "2001-01-01",
  sayname: "name1",
  actdate: "2001-01-01",
  actname: "name1",
  moddate: "2001-01-01",
  UUID: "8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704",
};

const entry2002 = {
  _: "datum",
  datum: "value2",
  filepath: "path/to/2",
  saydate: "2002-01-01",
  sayname: "name2",
  actdate: "2002-01-01",
  actname: "name2",
  moddate: "2002-01-01",
  UUID: "b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e",
};

const entry2003Unedited = {
  _: "datum",
  datum: "",
  saydate: "2003-01-01",
  sayname: "name3",
  actdate: "2003-01-01",
  actname: "name3",
  UUID: "f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265",
};

function sortObject(a) {
  return Object.keys(a)
    .sort()
    .reduce((obj, key) => ({ ...obj, [key]: a[key] }), {});
}

const callback = {
  readFile: (path) => metadir[path],
  grep,
};

await init();

function expect(received, expected) {
  if (JSON.stringify(received) === JSON.stringify(expected)) {
    console.log("V");
  } else {
    console.log("X, expected ", expected, ", got ", received);
  }
}

async function testQuery1() {
  console.log("queries name1");

  const searchParams = new URLSearchParams();

  searchParams.set("actname", "name1");

  const data = await new CSVS(callback).select(searchParams);

  expect(data.map(sortObject), [sortObject(entry2001)]);
}

async function testQuery2() {
  console.log("queries name2");

  const searchParams = new URLSearchParams();

  searchParams.set("actname", "name2");

  const data = await new CSVS(callback).select(searchParams);

  expect(data.map(sortObject), [sortObject(entry2002)]);
}

async function testQuery3() {
  console.log("queries name3");

  const searchParams = new URLSearchParams();

  searchParams.set("actname", "name3");

  const data = await new CSVS(callback).select(searchParams);

  expect(data.map(sortObject), [sortObject(entry2003Unedited)]);
}

async function testQueryFalse() {
  console.log("queries false");

  const searchParams = new URLSearchParams();

  searchParams.set("actname", "false");

  const data = await new CSVS(callback).select(searchParams);

  expect(data.map(sortObject), []);
}

async function testQueryRegex() {
  console.log("queries regexp");

  const searchParams = new URLSearchParams();

  searchParams.set("actname", "name.*");

  const data = await new CSVS(callback).select(searchParams);

  const dataSorted = data
    .map(sortObject)
    .sort((a, b) => (a.saydate < b.saydate ? -1 : 1));

  expect(dataSorted, [
    sortObject(entry2001),
    sortObject(entry2002),
    sortObject(entry2003Unedited),
  ]);
}

async function testQueryLeaf() {
  console.log("queries moddate");

  const searchParams = new URLSearchParams();

  searchParams.set("moddate", "2001-01-01");

  const data = await new CSVS(callback).select(searchParams);

  expect(data.map(sortObject), [sortObject(entry2001)]);
}

async function testQueryLeafRegex() {
  console.log("queries moddate regex");

  const searchParams = new URLSearchParams();

  searchParams.set("moddate", ".*-01-01");

  let data;

  try {
    data = await new CSVS(callback).select(searchParams);

    data = data.map(sortObject);
  } catch (e) {
    console.log(e);
  }

  expect(data, [sortObject(entry2001), sortObject(entry2002)]);
}

async function testQueryTwoQueries() {
  console.log("queries two params");

  const searchParams = new URLSearchParams();

  searchParams.set("actname", "name.*");

  searchParams.set("actdate", "2001-01-01");

  let data;

  try {
    data = await new CSVS(callback).select(searchParams);

    data = data.map(sortObject);
  } catch (e) {
    console.log(e);
  }

  expect(data, [sortObject(entry2001)]);
}

export default async function test() {
  console.log("Query.select()");

  await testQuery1();

  await testQuery2();

  await testQuery3();

  await testQueryFalse();

  await testQueryRegex();

  await testQueryLeaf();

  await testQueryLeafRegex();

  await testQueryTwoQueries();
}
