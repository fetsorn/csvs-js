import metadirDefault from './metadir_default';
import schema from './schema_tags';

const metadir = { ...metadirDefault };

metadir['metadir.json'] = schema;

metadir['metadir/pairs/datum-export_tags.csv'] = '8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f';

metadir['metadir/pairs/export_tags-export1_tag.csv'] = `9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f,1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42
9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f,fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77
`;

metadir['metadir/pairs/export_tags-export2_tag.csv'] = '9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f,de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579';

metadir['metadir/pairs/export1_tag-export1_channel.csv'] = `1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42,48718bde0f6fee7e18f334031ea8b2ed077d0f3a7f872c4d3a441086c1061fe6
fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77,006e3cf8784a70545057300713dfa7158b56809e82d1d4af54ab62ddf075e058
`;

metadir['metadir/pairs/export1_tag-export1_key.csv'] = `1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42,e47433963c36de04551879a9962a0202fc702ea10dff51aa2b6edb5f8afae13d
fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77,abac8bbea68b198465c7fd3200ff734fc562fd8791c339adf3c4f1370a45e9db
`;

metadir['metadir/pairs/export2_tag-export2_username.csv'] = 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579,bc48c1b3e2454adf0bd8b9c23f2bc125742b7a57377c3f8a36fb36cb9753c870';

metadir['metadir/pairs/export2_tag-export2_password.csv'] = 'de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579,6b3a55e0261b0304143f805a24924d0c1c44524821305f31d9277843b8a10f4e';

metadir['metadir/props/export1_channel/index.csv'] = `48718bde0f6fee7e18f334031ea8b2ed077d0f3a7f872c4d3a441086c1061fe6,"https://channel1.url"
006e3cf8784a70545057300713dfa7158b56809e82d1d4af54ab62ddf075e058,"https://channel2.url"
`;

metadir['metadir/props/export1_key/index.csv'] = `e47433963c36de04551879a9962a0202fc702ea10dff51aa2b6edb5f8afae13d,"longkey1"
abac8bbea68b198465c7fd3200ff734fc562fd8791c339adf3c4f1370a45e9db,"longkey2"
`;

metadir['metadir/props/export2_username/index.csv'] = 'bc48c1b3e2454adf0bd8b9c23f2bc125742b7a57377c3f8a36fb36cb9753c870,"username"';

metadir['metadir/props/export2_password/index.csv'] = '6b3a55e0261b0304143f805a24924d0c1c44524821305f31d9277843b8a10f4e,"password"';

export default metadir;
