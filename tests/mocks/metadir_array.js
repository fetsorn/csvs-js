/* eslint-disable import/extensions */
// .js extensions are required for wasm tests
import schema from './schema_array.js';

const metadir = { };

metadir['metadir.json'] = schema;

metadir['metadir/props/datum/index.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,"value1"
`;

metadir['metadir/props/name/index.csv'] = `9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1,name1
`;

metadir['metadir/props/date/index.csv'] = `4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d,2001-01-01
`;

metadir['metadir/props/export_tags/index.csv'] = `9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f
`;

metadir['metadir/props/export1_tag/index.csv'] = `1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42
fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77
`;

metadir['metadir/props/export2_tag/index.csv'] = `de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579
`;

metadir['metadir/props/export1_channel/index.csv'] = `63437e32bb26ceb2573dfcc40d39d910f994509d0c2ebee14865e2bfd93b50cd,"https://channel1.url"
704fa022122f091ab89c1ad98a7fb9b38fcc13a9491b79ebf95d2f2ed705142f,"https://channel2.url"
`;

metadir['metadir/props/export1_key/index.csv'] = `a7dfd582f1176e0caf0302cd7993a26645e41ebdcaee195530cbdf85971d06fb,"longkey1"
0150e70d69706d9afe2ce75b31a3050bd981cd22040155af13b971010763c582,"longkey2"
`;

metadir['metadir/props/export2_username/index.csv'] = `16f78a7d6317f102bbd95fc9a4f3ff2e3249287690b8bdad6b7810f82b34ace3,"username"
`;

metadir['metadir/props/export2_password/index.csv'] = `5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8,"password"
`;

metadir['metadir/pairs/datum-actname.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9367417d63903350aeb7e092bca792263d4fd82d4912252e014e073a8931b4c1
`;

metadir['metadir/pairs/datum-actdate.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,4935b73812dd87780ee8deae03d0bbcb125bbcdc05271066ca527ab029e4e79d
`;

metadir['metadir/pairs/datum-export_tags.csv'] = `8260502525153a8775ecb052f41e4e908aba4c94b07ef90263fff77195392704,9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f
`;

metadir['metadir/pairs/export_tags-export1_tag.csv'] = `9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f,1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42
9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f,fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77
`;

metadir['metadir/pairs/export_tags-export2_tag.csv'] = `9bd029a8136649623e645a70938b4dc00e6d1c640a5293425e5eee82a8a21f7f,de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579
`;

metadir['metadir/pairs/export1_tag-export1_channel.csv'] = `1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42,63437e32bb26ceb2573dfcc40d39d910f994509d0c2ebee14865e2bfd93b50cd
fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77,704fa022122f091ab89c1ad98a7fb9b38fcc13a9491b79ebf95d2f2ed705142f
`;

metadir['metadir/pairs/export1_tag-export1_key.csv'] = `1c42c99eab4eba24719bf22ae9f2132e914679f4503d1b22652aa515c0bace42,a7dfd582f1176e0caf0302cd7993a26645e41ebdcaee195530cbdf85971d06fb
fcd10e054b600a2ace70c0cf9d9ebf11c4df86c4ed029000f509d6ebaf473d77,0150e70d69706d9afe2ce75b31a3050bd981cd22040155af13b971010763c582
`;

metadir['metadir/pairs/export2_tag-export2_username.csv'] = `de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579,16f78a7d6317f102bbd95fc9a4f3ff2e3249287690b8bdad6b7810f82b34ace3
`;

metadir['metadir/pairs/export2_tag-export2_password.csv'] = `de0bb32caddc0c5685f46b54ed3409649a48643b90e7a3d27980ed2d017be579,5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
`;

export default metadir;
