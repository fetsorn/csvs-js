const record2001 = {
  _: 'datum',
  datum: 'value1',
  filepath: { _: 'filepath', filepath: 'path/to/1', moddate: '2001-01-01'},
  saydate: '2001-01-01',
  sayname: 'name1',
  actdate: '2001-01-01',
  actname: 'name1',
};

const record2002 = {
  _: 'datum',
  datum: 'value2',
  filepath: { _: 'filepath', filepath: 'path/to/2', moddate: '2002-01-01'},
  saydate: '2002-01-01',
  sayname: 'name2',
  actdate: '2002-01-01',
  actname: 'name2',
};

const record2003Unedited = {
  _: 'datum',
  datum: '',
  saydate: '2003-01-01',
  sayname: 'name3',
  actdate: '2003-01-01',
  actname: 'name3',
};

const record2003Edited = {
  _: 'datum',
  datum: 'value3',
  filepath: 'path/to/3',
  saydate: '2003-03-01',
  sayname: 'name3',
  actdate: '2003-01-01',
  actname: 'name3',
};

const recordAdded = {
  _: 'datum',
  datum: 'value4',
  saydate: '2004-01-01',
  sayname: 'name4',
  actdate: '2005-01-01',
  actname: 'name5',
};

const recordArray = {
  _: 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    _: 'export_tags',
    export_tags: "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: 'export1_tag',
        export1_tag: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
      },
      {
        _: 'export1_tag',
        export1_tag: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
      }
    ],
    export2_tag: {
      _: 'export2_tag',
      export2_tag: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      export2_username: 'username',
      export2_password: 'password',
    },
  },
};

const recordArrayAdded = {
  _: 'datum',
  datum: 'value2',
  actdate: '2002-01-01',
  actname: 'name2',
  export_tags: {
    _: 'export_tags',
    export_tags: '20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49',
    export1_tag: [ {
      _: 'export1_tag',
      export1_tag: 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35',
      export1_channel: 'https://channel2.url',
      export1_key: 'longkey2',
    } ],
  },
};

const recordAddedArrayItem = {
  _: 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    _: 'export_tags',
    export_tags: "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: 'export1_tag',
        export1_tag: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
      },
      {
        _: 'export1_tag',
        export1_tag: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
      }
    ],
    export2_tag: [
      {
        _: 'export2_tag',
        export2_tag: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
        export2_username: 'username',
        export2_password: 'password',
      },
      {
        _: 'export2_tag',
        export2_tag: '20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49',
        export2_username: 'username2',
        export2_password: 'password2',
      },
    ],
  },
};

const recordEditedArrayItem = {
  _: 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    _: 'export_tags',
    export_tags: "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: 'export1_tag',
        export1_tag: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey3',
      },
      {
        _: 'export1_tag',
        export1_tag: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
      }
    ],
    export2_tag: {
      _: 'export2_tag',
      export2_tag: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      export2_username: 'username',
      export2_password: 'password',
    },
  },
};

const recordDeletedArrayItem = {
  _: 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    _: 'export_tags',
    export_tags: "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: 'export1_tag',
        export1_tag: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
      },
    ],
    export2_tag: {
      _: 'export2_tag',
      export2_tag: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      export2_username: 'username',
      export2_password: 'password',
    },
  },
};

const recordEditedArrayItemObject = {
  _: 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    _: 'export_tags',
    export_tags: "9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f",
    export1_tag: [
      {
        _: 'export1_tag',
        export1_tag: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
      },
      {
        _: 'export1_tag',
        export1_tag: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
      }
    ],
    export2_tag: {
      _: 'export2_tag',
      export2_tag: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      export2_username: 'username',
      export2_password: 'password',
      export2_tag_description: {
        _: 'export2_tag_description',
        export2_tag_description: '20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49',
        export2_tag_description_text1: 'text1',
        export2_tag_description_text2: 'text2',
      },
    },
  },
};

const recordArrayLiteral = {
  _: 'datum',
  datum: 'value1',
  filepath: { _: 'filepath', filepath: 'path/to/1', moddate: '2001-01-01'},
  saydate: '2001-01-01',
  sayname: [ 'name1', 'name2' ],
  actdate: '2001-01-01',
  actname: 'name1',
};

const recordExport1Tag = {
  _: 'export1_tag',
  export1_tag: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
  export1_channel: 'https://channel1.url',
  export1_key: 'longkey1',
};

const recordSchema = {
  _: '_',
  datum: [ "actdate", "actname", "saydate", "sayname", "privacy", "tag", "filepath" ],
  filepath: [ "moddate", "filehash", "filetype", "filesize", "pathrule" ]
};

const recordSchemaLiteral = {
  _: '_',
  datum: [ "actdate", "actname", "saydate", "sayname", "privacy", "tag", "filepath" ],
  filepath: [ "moddate", "filehash", "filetype", "filesize", "pathrule" ],
  person: "parent"
};

const record2001Filepath = { _: 'filepath', filepath: 'path/to/1', moddate: '2001-01-01'};

export default {
  record2001,
  record2002,
  record2003Unedited,
  record2003Edited,
  recordAdded,
  recordArray,
  recordArrayAdded,
  recordAddedArrayItem,
  recordEditedArrayItem,
  recordDeletedArrayItem,
  recordEditedArrayItemObject,
  recordArrayLiteral,
  recordExport1Tag,
  recordSchema,
  recordSchemaLiteral,
  record2001Filepath
};
