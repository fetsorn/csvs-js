const entry2001 = {
  '|': 'datum',
  datum: 'value1',
  filepath: 'path/to/1',
  saydate: '2001-01-01',
  sayname: 'name1',
  actdate: '2001-01-01',
  actname: 'name1',
  moddate: '2001-01-01',
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entry2002 = {
  '|': 'datum',
  datum: 'value2',
  filepath: 'path/to/2',
  saydate: '2002-01-01',
  sayname: 'name2',
  actdate: '2002-01-01',
  actname: 'name2',
  moddate: '2002-01-01',
  UUID: 'b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e',
};

const entry2003Unedited = {
  '|': 'datum',
  datum: '',
  saydate: '2003-01-01',
  sayname: 'name3',
  actdate: '2003-01-01',
  actname: 'name3',
  UUID: 'f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265',
};

const entry2003Edited = {
  '|': 'datum',
  datum: 'value3',
  filepath: 'path/to/3',
  saydate: '2003-03-01',
  sayname: 'name3',
  actdate: '2003-01-01',
  actname: 'name3',
  UUID: 'f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265',
};

const entryAdded = {
  '|': 'datum',
  datum: 'value4',
  saydate: '2004-01-01',
  sayname: 'name4',
  actdate: '2005-01-01',
  actname: 'name5',
};

const entryArray = {
  '|': 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    '|': 'export_tags',
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        '|': 'export2_tag',
        export2_username: 'username',
        export2_password: 'password',
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
        UUID: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entryArrayAdded = {
  '|': 'datum',
  datum: 'value2',
  actdate: '2002-01-01',
  actname: 'name2',
  export_tags: {
    '|': 'export_tags',
    items: [
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
      },
    ],
  },
};

const entryAddedArrayItem = {
  '|': 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    '|': 'export_tags',
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
        UUID: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
      },
      {
        '|': 'export2_tag',
        export2_username: 'username',
        export2_password: 'password',
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
      {
        '|': 'export2_tag',
        export2_username: 'username2',
        export2_password: 'password2',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entryEditedArrayItem = {
  '|': 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    '|': 'export_tags',
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey3',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
        UUID: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
      },
      {
        '|': 'export2_tag',
        export2_username: 'username',
        export2_password: 'password',
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entryDeletedArrayItem = {
  '|': 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    '|': 'export_tags',
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        '|': 'export2_tag',
        export2_username: 'username',
        export2_password: 'password',
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entryEditedArrayItemObject = {
  '|': 'datum',
  datum: 'value1',
  actdate: '2001-01-01',
  actname: 'name1',
  export_tags: {
    '|': 'export_tags',
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel1.url',
        export1_key: 'longkey1',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        '|': 'export2_tag',
        export2_username: 'username',
        export2_password: 'password',
        export2_tag_description: {
          '|': 'export2_tag_description',
          export2_tag_description_text1: 'text1',
          export2_tag_description_text2: 'text2',
        },
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
      {
        '|': 'export1_tag',
        export1_channel: 'https://channel2.url',
        export1_key: 'longkey2',
        UUID: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entryExport1Tag = {
  '|': 'export1_tag',
  export1_channel: 'https://channel1.url',
  export1_key: 'longkey1',
  UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
};

export {
  entry2001,
  entry2002,
  entry2003Unedited,
  entry2003Edited,
  entryAdded,
  entryArray,
  entryArrayAdded,
  entryAddedArrayItem,
  entryEditedArrayItem,
  entryDeletedArrayItem,
  entryEditedArrayItemObject,
  entryExport1Tag,
};
