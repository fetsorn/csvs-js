export default `{
  "datum": {
    "type": "string",
    "label": "datum"
  },
  "actdate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "actdate"
  },
  "actname": {
    "trunk": "datum",
    "dir": "name",
    "label": "actname"
  },
  "saydate": {
    "trunk": "datum",
    "dir": "date",
    "type": "date",
    "label": "saydate"
  },
  "sayname": {
    "trunk": "datum",
    "dir": "name",
    "label": "sayname"
  },
  "tag": {
    "trunk": "datum",
    "label": "tag"
  },
  "filepath": {
    "trunk": "datum",
    "label": "filepath",
    "type": "string"
  },
  "moddate": {
    "trunk": "filepath",
    "dir": "date",
    "type": "date",
    "label": "moddate"
  },
  "filetype": {
    "trunk": "filepath",
    "label": "filetype",
    "type": "string"
  },
  "filesize": {
    "trunk": "filepath",
    "label": "filesize"
  },
  "filehash": {
    "trunk": "filepath",
    "label": "filehash",
    "type": "hash"
  },
  "pathrule": {
    "trunk": "filepath",
    "type": "regex"
  }
}`;
