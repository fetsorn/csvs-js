const record2001 = {
  _: "datum",
  datum: "value1",
  filepath: { _: "filepath", filepath: "path/to/1", moddate: "2001-01-01" },
  saydate: "2001-01-01",
  sayname: "name1",
  actdate: "2001-01-01",
  actname: "name1",
};

const record2001Edited = {
  _: "datum",
  datum: "value1",
  filepath: { _: "filepath", filepath: "path/to/1", moddate: "2001-01-01" },
  saydate: "2001-01-01",
  sayname: "name1",
  actdate: "2001-01-01",
  actname: "name2",
};

const record2002 = {
  _: "datum",
  datum: "value2",
  filepath: { _: "filepath", filepath: "path/to/2", moddate: "2002-01-01" },
  saydate: "2002-01-01",
  sayname: "name2",
  actdate: "2002-01-01",
  actname: "name2",
};

const record2003Unedited = {
  _: "datum",
  datum: "",
  saydate: "2003-01-01",
  sayname: "name3",
  actdate: "2003-01-01",
  actname: "name3",
};

const record2003Edited = {
  _: "datum",
  datum: "value3",
  filepath: "path/to/3",
  saydate: "2003-03-01",
  sayname: "name3",
  actdate: "2003-01-01",
  actname: "name3",
};

const recordAdded = {
  _: "datum",
  datum: "value4",
  saydate: "2004-01-01",
  sayname: "name4",
  actdate: "2005-01-01",
  actname: "name5",
};

const recordArraySimple = {
  _: "datum",
  datum: "value2",
  filepath: { _: "filepath", filepath: "path/to/2", moddate: "2002-01-01" },
  saydate: "2002-01-01",
  sayname: ["name2", "name3"],
  actdate: "2002-01-01",
  actname: "name2",
};

const recordsArrayDouble = [
  {
    _: "datum",
    actdate: "2001-01-01",
    actname: "name1",
    datum: "value1",
    filepath: { _: "filepath", filepath: "path/to/1", moddate: "2001-01-01" },
    saydate: "2001-01-01",
    sayname: ["name1", "name1"],
  },
  {
    _: "datum",
    actdate: "2002-01-01",
    actname: "name2",
    datum: "value2",
    filepath: { _: "filepath", filepath: "path/to/2", moddate: "2002-01-01" },
    saydate: "2002-01-01",
    sayname: ["name2", "name3"],
  },
];

const recordArray = {
  _: "datum",
  datum: "value1",
  actdate: "2001-01-01",
  actname: "name1",
  export_tags: {
    _: "export_tags",
    export_tags:
      "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: "export1_tag",
        export1_tag:
          "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        export1_channel: "https://channel1.url",
        export1_key: "longkey1",
      },
      {
        _: "export1_tag",
        export1_tag:
          "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77",
        export1_channel: "https://channel2.url",
        export1_key: "longkey2",
      },
    ],
    export2_tag: {
      _: "export2_tag",
      export2_tag:
        "de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579",
      export2_username: "username",
      export2_password: "password",
    },
  },
};

const recordArrayAdded = {
  _: "datum",
  datum: "value2",
  actdate: "2002-01-01",
  actname: "name2",
  export_tags: {
    _: "export_tags",
    export_tags:
      "20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49",
    export1_tag: [
      {
        _: "export1_tag",
        export1_tag:
          "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
        export1_channel: "https://channel2.url",
        export1_key: "longkey2",
      },
    ],
  },
};

const recordAddedArrayItem = {
  _: "datum",
  datum: "value1",
  actdate: "2001-01-01",
  actname: "name1",
  export_tags: {
    _: "export_tags",
    export_tags:
      "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: "export1_tag",
        export1_tag:
          "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        export1_channel: "https://channel1.url",
        export1_key: "longkey1",
      },
      {
        _: "export1_tag",
        export1_tag:
          "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77",
        export1_channel: "https://channel2.url",
        export1_key: "longkey2",
      },
    ],
    export2_tag: [
      {
        _: "export2_tag",
        export2_tag:
          "de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579",
        export2_username: "username",
        export2_password: "password",
      },
      {
        _: "export2_tag",
        export2_tag:
          "20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49",
        export2_username: "username2",
        export2_password: "password2",
      },
    ],
  },
};

const recordEditedArrayItem = {
  _: "datum",
  datum: "value1",
  actdate: "2001-01-01",
  actname: "name1",
  export_tags: {
    _: "export_tags",
    export_tags:
      "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: "export1_tag",
        export1_tag:
          "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        export1_channel: "https://channel1.url",
        export1_key: "longkey3",
      },
      {
        _: "export1_tag",
        export1_tag:
          "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77",
        export1_channel: "https://channel2.url",
        export1_key: "longkey2",
      },
    ],
    export2_tag: {
      _: "export2_tag",
      export2_tag:
        "de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579",
      export2_username: "username",
      export2_password: "password",
    },
  },
};

const recordDeletedArrayItem = {
  _: "datum",
  datum: "value1",
  actdate: "2001-01-01",
  actname: "name1",
  export_tags: {
    _: "export_tags",
    export_tags:
      "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: "export1_tag",
        export1_tag:
          "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        export1_channel: "https://channel1.url",
        export1_key: "longkey1",
      },
    ],
    export2_tag: {
      _: "export2_tag",
      export2_tag:
        "de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579",
      export2_username: "username",
      export2_password: "password",
    },
  },
};

const recordEditedArrayItemObject = {
  _: "datum",
  datum: "value1",
  actdate: "2001-01-01",
  actname: "name1",
  export_tags: {
    _: "export_tags",
    export_tags:
      "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: "export1_tag",
        export1_tag:
          "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        export1_channel: "https://channel1.url",
        export1_key: "longkey1",
      },
      {
        _: "export1_tag",
        export1_tag:
          "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77",
        export1_channel: "https://channel2.url",
        export1_key: "longkey2",
      },
    ],
    export2_tag: {
      _: "export2_tag",
      export2_tag:
        "de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579",
      export2_username: "username",
      export2_password: "password",
      export2_tag_description: {
        _: "export2_tag_description",
        export2_tag_description:
          "20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49",
        export2_tag_description_text1: "text1",
        export2_tag_description_text2: "text2",
      },
    },
  },
};

const recordArrayLiteral = {
  _: "datum",
  datum: "value1",
  filepath: { _: "filepath", filepath: "path/to/1", moddate: "2001-01-01" },
  saydate: "2001-01-01",
  sayname: ["name1", "name2"],
  actdate: "2001-01-01",
  actname: "name1",
};

const recordExport1Tag = {
  _: "export1_tag",
  export1_tag:
    "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
  export1_channel: "https://channel1.url",
  export1_key: "longkey1",
};

const recordSchema = {
  _: "_",
  datum: [
    "actdate",
    "actname",
    "saydate",
    "sayname",
    "privacy",
    "tag",
    "filepath",
  ],
  filepath: ["moddate", "filehash", "filetype", "filesize", "pathrule"],
};

const recordSchemaLiteral = {
  _: "_",
  datum: [
    "actdate",
    "actname",
    "saydate",
    "sayname",
    "privacy",
    "tag",
    "filepath",
  ],
  filepath: ["moddate", "filehash", "filetype", "filesize", "pathrule"],
  person: "parent",
};

const record2001Filepath = {
  _: "filepath",
  filepath: "path/to/1",
  moddate: "2001-01-01",
};

const recordSchemaArray = {
  _: "_",
  datum: [
    "actdate",
    "actname",
    "saydate",
    "sayname",
    "privacy",
    "tag",
    "filepath",
    "export_tags",
  ],
  filepath: ["moddate", "filehash", "filetype", "filesize", "pathrule"],
  export_tags: ["export1_tag", "export2_tag"],
  export1_tag: ["export1_channel", "export1_key"],
  export2_tag: [
    "export2_username",
    "export2_password",
    "export2_tag_description",
  ],
  export2_tag_description: [
    "export2_tag_description_text1",
    "export2_tag_description_text2",
  ],
};

const recordQuotes = {
  _: "datum",
  datum: '"value1"',
  filepath: { _: "filepath", filepath: "path/to/1", moddate: "2001-01-01" },
  saydate: "2001-01-01",
  sayname: "name1",
  actdate: "2001-01-01",
  actname: "name1",
};

const recordNewline = {
  _: "datum",
  datum: "value\\n1",
  filepath: { _: "filepath", filepath: "path/to/1", moddate: "2001-01-01" },
  saydate: "2001-01-01",
  sayname: "name1",
  actdate: "2001-01-01",
  actname: "name1",
};

const recordPipe = {
  _: "datum",
  datum: "0006eaf0b2483928436885786943ae867affaa9faf647ac5a7eb1aa769e56432",
  actname:
    ": Land of Slings : Bridled Hill\\n: The Whimsical Tour : Blue Gloves\\n** 工具\\n|-----------+--------+--------------+---------|\\n| Month     | Number | Season       | Caravan |\\n|-----------+--------+--------------+---------|\\n| Granite   |     01 | Early-Spring |         |\\n| Slate     |     02 | Mid-  Spring | Elven   |\\n| Felsite   |     03 | Late- Spring |         |\\n| Hematite  |     04 | Early-Summer | Human   |\\n| Malachite |     05 | Mid-  Summer |         |\\n| Galena    |     06 | Late- Summer |         |\\n| Limestone |     07 | Early-Autumn | Dwarven |\\n| Sandstone |     08 | Mid-  Autumn |         |\\n| Timber    |     09 | Late- Autumn |         |\\n| Moonstone |     10 | Early-Winter | None    |\\n| Opal      |     11 | Mid-  Winter |         |\\n| Obsidian  |     12 | Late- Winter |         |\\n|-----------+--------+--------------+---------|",
};

const recordSemicolon = {
  _: "event",
  event: "event1",
  datum: "df; af; ha; ka; ad",
};

const grain2001 = {
  _: "datum",
  datum: "value1",
  saydate: "2001-01-01",
};

const record2001Sow = {
  _: "datum",
  datum: "value1",
  filepath: { _: "filepath", filepath: "path/to/1", moddate: "2001-01-01" },
  saydate: ["2001-01-01", "2001-01-01"],
  sayname: "name1",
  actdate: "2001-01-01",
  actname: "name1",
};

const grainArray = {
  _: "export_tags",
  export_tags:
    "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
  export1_tag:
    "a4bac6f8dacc74155b54e1a7855bd92d5054d6ca9d4086194eb8e6bb35f4324d",
};

const recordArraySow = {
  _: "datum",
  datum: "value1",
  actdate: "2001-01-01",
  actname: "name1",
  export_tags: {
    _: "export_tags",
    export_tags:
      "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: "export1_tag",
        export1_tag:
          "1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42",
        export1_channel: "https://channel1.url",
        export1_key: "longkey1",
      },
      {
        _: "export1_tag",
        export1_tag:
          "fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77",
        export1_channel: "https://channel2.url",
        export1_key: "longkey2",
      },
      "a4bac6f8dacc74155b54e1a7855bd92d5054d6ca9d4086194eb8e6bb35f4324d",
    ],
    export2_tag: {
      _: "export2_tag",
      export2_tag:
        "de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579",
      export2_username: "username",
      export2_password: "password",
    },
  },
};

const recordBaseNone = {};

const recordBaseIsTrait = { _: "datum", datum: "value1" };

const grainBaseIsTrait = { _: "datum", datum: "value1", filepath: "path/to/1" };

const recordSchemaBig = {
  _: "_",
  repo: [
    "reponame",
    "category",
    "branch",
    "local_tag",
    "remote_tag",
    "sync_tag",
  ],
  branch: ["trunk", "task", "cognate", "description_en", "description_ru"],
  remote_tag: ["remote_url", "remote_token"],
  sync_tag: ["sync_tag_search"],
};

export default {
  record2001,
  record2002,
  record2003Unedited,
  record2003Edited,
  recordAdded,
  recordArray,
  recordArraySimple,
  recordsArrayDouble,
  recordArrayAdded,
  recordAddedArrayItem,
  recordEditedArrayItem,
  recordDeletedArrayItem,
  recordEditedArrayItemObject,
  recordArrayLiteral,
  recordExport1Tag,
  recordSchema,
  recordSchemaLiteral,
  record2001Filepath,
  record2001Edited,
  recordSchemaArray,
  recordQuotes,
  recordNewline,
  recordPipe,
  recordSemicolon,
  grain2001,
  record2001Sow,
  grainArray,
  recordArraySow,
  recordBaseNone,
  recordBaseIsTrait,
  grainBaseIsTrait,
  recordSchemaBig,
};
