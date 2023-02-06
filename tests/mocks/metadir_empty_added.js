import schema from './schema';

const metadir = {};

metadir['metadir.json'] = schema;

metadir['metadir/props/datum/index.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,"value4"
`;

metadir['metadir/props/date/index.csv'] = `0c54836dcb1d1b88790774a67704dac761613d3af3fa942cb339d355328c5bb7,2005-01-01
d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8,2004-01-01
`;

metadir['metadir/pairs/datum-saydate.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,d21966fdfaca51c457dddf8b6f8089b41190551166eede4e377edcb762f6bcc8
`;

metadir['metadir/pairs/datum-actdate.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,0c54836dcb1d1b88790774a67704dac761613d3af3fa942cb339d355328c5bb7
`;

metadir['metadir/props/name/index.csv'] = `7b54eeb6e51f461d9d87a7f7718116ee79dfd90440775ce51f1f1963488d23f0,name5
8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5,name4
`;

metadir['metadir/pairs/datum-sayname.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,8b30955ad81009092a766bab12ede073956eb5ef1862f2ab5ac5b69ab43a79c5
`;

metadir['metadir/pairs/datum-actname.csv'] = `20b08f6b4c89ed92fa865b00b4ab8b8d4d09ae8ae8e2a400ddff841da8137e49,7b54eeb6e51f461d9d87a7f7718116ee79dfd90440775ce51f1f1963488d23f0
`;

export default metadir;
