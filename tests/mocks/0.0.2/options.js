const optionsActname = [
  {
    _: 'actname',
    '|': 'name5',
  },
  {
    '|': 'name1',
    _: 'actname',
  },
  {
    '|': 'name2',
    _: 'actname',
  },
  {
    '|': 'name3',
    _: 'actname',
  }
];

const optionsActdate = [{
  '|': '2005-01-01',
  _: 'actdate',
},
{
  '|': '2001-01-01',
  _: 'actdate',
},
{
  '|': '2002-01-01',
  _: 'actdate',
},
{
  '|': '2003-01-01',
  _: 'actdate',
}];

const optionsSayname = [{
  '|': 'name1',
  _: 'sayname',
},
{
  '|': 'name2',
  _: 'sayname',
},
{
  '|': 'name3',
  _: 'sayname',
},
{
  '|': 'name4',
  _: 'sayname',
}];

const optionsSaydate = [{
  '|': '2001-01-01',
  _: 'saydate',
},
{
  '|': '2002-01-01',
  _: 'saydate',
},
{
  '|': '2003-01-01',
  _: 'saydate',
},
{
  '|': '2004-01-01',
  _: 'saydate',
}];

const optionsExport1Tag = [{
  _: 'export1_tag',
  '|': '1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42',
  export1_channel: 'https://channel1.url',
  export1_key: 'longkey1',
},
{
  _: 'export1_tag',
  '|': 'fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77',
  export1_channel: 'https://channel2.url',
  export1_key: 'longkey2',
}];

export default {
  optionsActname,
  optionsActdate,
  optionsSayname,
  optionsSaydate,
  optionsExport1Tag,
};
