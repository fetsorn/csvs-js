const entry2001 = {
  DATUM: 'value1',
  FILE_PATH: 'path/to/1',
  SAY_DATE: '2001-01-01',
  SAY_NAME: 'name1',
  ACT_DATE: '2001-01-01',
  ACT_NAME: 'name1',
  MOD_DATE: '2001-01-01',
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entry2002 = {
  DATUM: 'value2',
  FILE_PATH: 'path/to/2',
  SAY_DATE: '2002-01-01',
  SAY_NAME: 'name2',
  ACT_DATE: '2002-01-01',
  ACT_NAME: 'name2',
  MOD_DATE: '2002-01-01',
  UUID: 'b52dc2b8884fc396c108c095da157d8607ee7d61a1e6b4b501b660d42f93c58e',
};

const entry2003Unedited = {
  DATUM: '',
  SAY_DATE: '2003-01-01',
  SAY_NAME: 'name3',
  ACT_DATE: '2003-01-01',
  ACT_NAME: 'name3',
  UUID: 'f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265',
};

const entry2003Edited = {
  DATUM: 'value3',
  FILE_PATH: 'path/to/3',
  SAY_DATE: '2003-03-01',
  SAY_NAME: 'name3',
  ACT_DATE: '2003-01-01',
  ACT_NAME: 'name3',
  UUID: 'f35d45c3ee3e68cf9e36ee10df3edb02104c22b2d47ab17e64114ffb9c208265',
};

const entryAdded = {
  DATUM: 'value4',
  SAY_DATE: '2004-01-01',
  SAY_NAME: 'name4',
  ACT_DATE: '2005-01-01',
  ACT_NAME: 'name5',
};

const entryArray = {
  DATUM: 'value1',
  ACT_DATE: '2001-01-01',
  ACT_NAME: 'name1',
  TAGS: {
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        ITEM_NAME: 'export1_tag',
        EXPORT1_CHANNEL: 'https://channel1.url',
        EXPORT1_KEY: 'longkey1',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        ITEM_NAME: 'export1_tag',
        EXPORT1_CHANNEL: 'https://channel2.url',
        EXPORT1_KEY: 'longkey2',
        UUID: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
      },
      {
        ITEM_NAME: 'export2_tag',
        EXPORT2_USERNAME: 'username',
        EXPORT2_PASSWORD: 'password',
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entryArrayAdded = {
  DATUM: 'value1',
  ACT_DATE: '2001-01-01',
  ACT_NAME: 'name1',
  TAGS: {
    items: [
      {
        ITEM_NAME: 'export1_tag',
        EXPORT1_CHANNEL: 'https://channel1.url',
        EXPORT1_KEY: 'longkey1',
      },
    ],
  },
};

const entryAddedArrayItem = {
  DATUM: 'value1',
  ACT_DATE: '2001-01-01',
  ACT_NAME: 'name1',
  TAGS: {
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        ITEM_NAME: 'export1_tag',
        EXPORT1_CHANNEL: 'https://channel1.url',
        EXPORT1_KEY: 'longkey1',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        ITEM_NAME: 'export1_tag',
        EXPORT1_CHANNEL: 'https://channel2.url',
        EXPORT1_KEY: 'longkey2',
        UUID: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
      },
      {
        ITEM_NAME: 'export2_tag',
        EXPORT2_USERNAME: 'username',
        EXPORT2_PASSWORD: 'password',
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
      {
        ITEM_NAME: 'export2_tag',
        EXPORT2_USERNAME: 'username2',
        EXPORT2_PASSWORD: 'password2',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
};

const entryEditedArrayItem = {
  DATUM: 'value1',
  ACT_DATE: '2001-01-01',
  ACT_NAME: 'name1',
  TAGS: {
    UUID: '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f',
    items: [
      {
        ITEM_NAME: 'export1_tag',
        EXPORT1_CHANNEL: 'https://channel1.url',
        EXPORT1_KEY: 'longkey3',
        UUID: '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
      },
      {
        ITEM_NAME: 'export1_tag',
        EXPORT1_CHANNEL: 'https://channel2.url',
        EXPORT1_KEY: 'longkey2',
        UUID: 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
      },
      {
        ITEM_NAME: 'export2_tag',
        EXPORT2_USERNAME: 'username',
        EXPORT2_PASSWORD: 'password',
        UUID: 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579',
      },
    ],
  },
  UUID: '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704',
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
};
