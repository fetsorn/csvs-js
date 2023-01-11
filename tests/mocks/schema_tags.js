export default `{
  "datum": {
    "type": "string",
    "label": "DATUM"
  },
  "actdate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "ACT_DATE"
  },
  "actname": {
    "trunk": "datum",
    "dir": "name",
    "label": "ACT_NAME"
  },
  "saydate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "SAY_DATE"
  },
  "sayname": {
    "trunk": "datum",
    "dir": "name",
    "label": "SAY_NAME"
  },
  "filepath": {
    "trunk": "datum",
    "label": "FILE_PATH",
    "type": "string"
  },
  "moddate": {
    "trunk": "filepath",
    "dir": "date",
    "type": "date",
    "label": "MOD_DATE"
  },
  "filetype": {
    "trunk": "filepath",
    "label": "FILE_TYPE",
    "type": "string"
  },
  "filesize": {
    "trunk": "filepath",
    "label": "FILE_SIZE"
  },
  "filehash": {
    "trunk": "filepath",
    "label": "FILE_HASH",
    "type": "hash"
  },
  "pathrule": {
    "trunk": "filepath",
    "type": "regex"
  },
  "export_tags": {
    "trunk": "datum",
    "type": "array",
    "label": "TAGS"
  },
  "export1_tag": {
    "type": "object",
    "trunk": "export_tags",
    "label": "EXPORT1_TAG"
  },
  "export1_channel": {
    "trunk": "export1_tag",
    "type": "string",
    "label": "EXPORT1_CHANNEL"
  },
  "export1_key": {
    "trunk": "export1_tag",
    "type": "string",
    "label": "EXPORT1_KEY"
  },
  "export2_tag": {
    "type": "object",
    "trunk": "export_tags",
    "label": "EXPORT2_TAG"
  },
  "export2_username": {
    "trunk": "export2_tag",
    "type": "string",
    "label": "EXPORT2_USERNAME"
  },
  "export2_password": {
    "trunk": "export2_tag",
    "type": "string",
    "label": "EXPORT2_PASSWORD"
  }
}`;
