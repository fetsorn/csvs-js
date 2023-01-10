import metadirDefault from './metadir_default';
import schema from './schema_unordered';

const metadir = { ...metadirDefault };

metadir['metadir.json'] = schema;

export default metadir;
