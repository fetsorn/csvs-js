const entry1 = {
  DATUM: 'value1',
  FILE_PATH: 'path/to/1',
  SAY_DATE: '2001-01-01',
  SAY_NAME: 'name1',
  ACT_DATE: '2001-01-01',
  ACT_NAME: 'name1',
  MOD_DATE: '2001-01-01',
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entry2 = {
  DATUM: 'value2',
  FILE_PATH: 'path/to/2',
  SAY_DATE: '2002-01-01',
  SAY_NAME: 'name2',
  ACT_DATE: '2002-01-01',
  ACT_NAME: 'name2',
  MOD_DATE: '2002-01-01',
  UUID: 'b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e',
};

const entry3 = {
  DATUM: '',
  SAY_DATE: '2003-01-01',
  SAY_NAME: 'name3',
  ACT_DATE: '2003-01-01',
  ACT_NAME: 'name3',
  UUID: 'f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265',
};

const entry3edit = {
  DATUM: 'value3',
  FILE_PATH: 'path/to/3',
  SAY_DATE: '2003-03-01',
  SAY_NAME: 'name3',
  ACT_DATE: '2003-01-01',
  ACT_NAME: 'name3',
  UUID: 'f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265',
};

const entry4 = {
  DATUM: 'value4',
  SAY_DATE: '2004-01-01',
  SAY_NAME: 'name4',
  ACT_DATE: '2005-01-01',
  ACT_NAME: 'name5',
};

const schema = `{
  "datum": {
    "type": "string",
    "label": "DATUM"
  },
  "actdate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "ACT_DATE"
  },
  "actname": {
    "trunk": "datum",
    "dir": "name",
    "label": "ACT_NAME"
  },
  "saydate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "SAY_DATE"
  },
  "sayname": {
    "trunk": "datum",
    "dir": "name",
    "label": "SAY_NAME"
  },
  "tag": {
    "trunk": "datum",
    "label": "TAG"
  },
  "filepath": {
    "trunk": "datum",
    "label": "FILE_PATH",
    "type": "string"
  },
  "moddate": {
    "trunk": "filepath",
    "dir": "date",
    "type": "date",
    "label": "MOD_DATE"
  },
  "filetype": {
    "trunk": "filepath",
    "label": "FILE_TYPE",
    "type": "string"
  },
  "filesize": {
    "trunk": "filepath",
    "label": "FILE_SIZE"
  },
  "filehash": {
    "trunk": "filepath",
    "label": "FILE_HASH",
    "type": "hash"
  },
  "pathrule": {
    "trunk": "filepath",
    "type": "regex"
  }
}
`;

const schemaUnordered = `{
  "moddate": {
    "trunk": "filepath",
    "dir": "date",
    "type": "date",
    "label": "MOD_DATE"
  },
  "filetype": {
    "trunk": "filepath",
    "label": "FILE_TYPE",
    "type": "string"
  },
  "filesize": {
    "trunk": "filepath",
    "label": "FILE_SIZE"
  },
  "filehash": {
    "trunk": "filepath",
    "label": "FILE_HASH",
    "type": "hash"
  },
  "actdate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "ACT_DATE"
  },
  "tag": {
    "trunk": "datum",
    "label": "TAG"
  },
  "filepath": {
    "trunk": "datum",
    "label": "FILE_PATH",
    "type": "string"
  },
  "actname": {
    "trunk": "datum",
    "dir": "name",
    "label": "ACT_NAME"
  },
  "datum": {
    "type": "string",
    "label": "DATUM"
  },
  "saydate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "SAY_DATE"
  },
  "sayname": {
    "trunk": "datum",
    "dir": "name",
    "label": "SAY_NAME"
  },
  "pathrule": {
    "trunk": "filepath",
    "type": "regex"
  }
}
`;

const filesEmpty = {};

filesEmpty['metadir.json'] = schema;

const filesMock = { ...filesEmpty };

filesMock['metadir/pairs/datum-sayname.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
`;

filesMock['metadir/pairs/datum-actname.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
`;

filesMock['metadir/pairs/datum-saydate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
`;

filesMock['metadir/pairs/datum-actdate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
`;

filesMock['metadir/pairs/datum-filepath.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865
`;

filesMock['metadir/pairs/filepath-moddate.csv'] = `01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
`;

filesMock['metadir/props/name/index.csv'] = `9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1,name1
069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0,name2
b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690,name3
`;

filesMock['metadir/props/date/index.csv'] = `4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc,2002-01-01
28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10,2003-01-01
`;

filesMock['metadir/props/filepath/index.csv'] = `01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee,"path/to/1"
424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865,"path/to/2"
`;

filesMock['metadir/props/datum/index.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,""
`;

const filesMock3 = { ...filesMock };

filesMock3['metadir/props/datum/index.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,"value3"
`;

filesMock3['metadir/props/filepath/index.csv'] = `01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee,"path/to/1"
424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865,"path/to/2"
1e8251d0c0cfed1944735156e09c934976ece0bf6b89f75e0ba16f372ec9aa05,"path/to/3"
`;

filesMock3['metadir/pairs/datum-filepath.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,1e8251d0c0cfed1944735156e09c934976ece0bf6b89f75e0ba16f372ec9aa05
`;

filesMock3['metadir/props/date/index.csv'] = `4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc,2002-01-01
28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10,2003-01-01
e11f6f7cedcf5fd13d31ba71df973a1d28f48c847331fa852c17f1d4f5fdc746,2003-03-01
`;

filesMock3['metadir/pairs/datum-saydate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,e11f6f7cedcf5fd13d31ba71df973a1d28f48c847331fa852c17f1d4f5fdc746
`;

const filesMock4 = { ...filesMock };

filesMock4['metadir/props/datum/index.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,""
20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,"value4"
`;

filesMock4['metadir/props/date/index.csv'] = `4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc,2002-01-01
28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10,2003-01-01
d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8,2004-01-01
0c54836dcb1d1b88790774a67704dac761613d3af3fa942cb339d355328c5bb7,2005-01-01
`;

filesMock4['metadir/pairs/datum-saydate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8
`;

filesMock4['metadir/pairs/datum-actdate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,28a15dd418a2eed8bc7c2133b21bf942182cc58160dfea0c9dd98f155d80ea10
20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,0c54836dcb1d1b88790774a67704dac761613d3af3fa942cb339d355328c5bb7
`;

filesMock4['metadir/props/name/index.csv'] = `9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1,name1
069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0,name2
b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690,name3
8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5,name4
7b54eeb6e51f461d9d87a7f7718116ee79dfd90440775ce51f1f1963488d23f0,name5
`;

filesMock4['metadir/pairs/datum-sayname.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5
`;

filesMock4['metadir/pairs/datum-actname.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265,b218ca013905fc528204bdadf9e104acd87d646a2d90ef834526fbf85b17e690
20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,7b54eeb6e51f461d9d87a7f7718116ee79dfd90440775ce51f1f1963488d23f0
`;

const filesMockNo3 = { ...filesMock };

filesMockNo3['metadir/pairs/datum-sayname.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
`;

filesMockNo3['metadir/pairs/datum-actname.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,069587dcb8f8b63329ae53051ba79ba34ba0deb41c7a1e044280d7b6bb15e4f0
`;

filesMockNo3['metadir/pairs/datum-saydate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
`;

filesMockNo3['metadir/pairs/datum-actdate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,161c6b3d37ba3341b7775b10730b2ded837c3d84d77fb1a046fa198e9db8cbbc
`;

filesMockNo3['metadir/pairs/datum-filepath.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,01f8dafeb2559c983006156763f9c3b951b64688b3b41a9e5ad7cb695110e8ee
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,424bd3271c0c940304ec6e9f4412a422735caeeb9638038bf509e36ae5d4f865
`;

filesMockNo3['metadir/props/datum/index.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e,"value2"
`;

const filesMock5 = { ...filesEmpty };

filesMock5['metadir/props/datum/index.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,"value4"
`;

filesMock5['metadir/props/date/index.csv'] = `d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8,2004-01-01
0c54836dcb1d1b88790774a67704dac761613d3af3fa942cb339d355328c5bb7,2005-01-01
`;

filesMock5['metadir/pairs/datum-saydate.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8
`;

filesMock5['metadir/pairs/datum-actdate.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,0c54836dcb1d1b88790774a67704dac761613d3af3fa942cb339d355328c5bb7
`;

filesMock5['metadir/props/name/index.csv'] = `8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5,name4
7b54eeb6e51f461d9d87a7f7718116ee79dfd90440775ce51f1f1963488d23f0,name5
`;

filesMock5['metadir/pairs/datum-sayname.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5
`;

filesMock5['metadir/pairs/datum-actname.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,7b54eeb6e51f461d9d87a7f7718116ee79dfd90440775ce51f1f1963488d23f0
`;

const optionsActname = ['name1', 'name2', 'name3', 'name4', 'name5'];
const optionsActdate = ['2001-01-01', '2002-01-01', '2003-01-01', '2004-01-01', '2005-01-01'];
const optionsActnameGrep = ['name1', 'name2', 'name3', 'name5'];
const optionsActdateGrep = ['2001-01-01', '2002-01-01', '2003-01-01', '2005-01-01'];
const optionsSaynameGrep = ['name1', 'name2', 'name3', 'name4'];
const optionsSaydateGrep = ['2001-01-01', '2002-01-01', '2003-01-01', '2004-01-01'];

const filesMockUnordered = { ...filesMock };
filesMockUnordered['metadir.json'] = schemaUnordered;

export default {
  entry1,
  entry2,
  entry3,
  entry3edit,
  entry4,
  filesEmpty,
  filesMock,
  filesMock3,
  filesMock4,
  filesMockNo3,
  filesMock5,
  optionsActname,
  optionsActdate,
  optionsActnameGrep,
  optionsActdateGrep,
  optionsSaynameGrep,
  optionsSaydateGrep,
  filesMockUnordered,
};
