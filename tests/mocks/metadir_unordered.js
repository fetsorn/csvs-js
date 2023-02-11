/* eslint-disable import/extensions */
// .js extensions are required for wasm tests
import metadirDefault from './metadir_default.js';
import schema from './schema_unordered.js';

const metadir = { ...metadirDefault };

metadir['metadir.json'] = schema;

export default metadir;
