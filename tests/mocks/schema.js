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
  "tag": {
    "trunk": "datum",
    "label": "TAG"
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
  }
}`;
