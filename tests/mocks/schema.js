export default `{
  "datum": {
    "type": "string"
  },
  "actdate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date"
  },
  "actname": {
    "trunk": "datum",
    "dir": "name"
  },
  "saydate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date"
  },
  "sayname": {
    "trunk": "datum",
    "dir": "name"
  },
  "tag": {
    "trunk": "datum"
  },
  "filepath": {
    "trunk": "datum",
    "type": "string"
  },
  "moddate": {
    "trunk": "filepath",
    "dir": "date",
    "type": "date"
  },
  "filetype": {
    "trunk": "filepath",
    "type": "string"
  },
  "filesize": {
    "trunk": "filepath"
  },
  "filehash": {
    "trunk": "filepath",
    "type": "hash"
  },
  "pathrule": {
    "trunk": "filepath",
    "type": "regex"
  }
}`;
