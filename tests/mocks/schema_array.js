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
  },
  "export_tags": {
    "trunk": "datum",
    "type": "array",
    "label": "export_tags"
  },
  "export1_tag": {
    "trunk": "export_tags",
    "type": "object",
    "label": "export1_tag"
  },
  "export1_channel": {
    "trunk": "export1_tag",
    "type": "string",
    "label": "export1_channel"
  },
  "export1_key": {
    "trunk": "export1_tag",
    "type": "string",
    "label": "export1_key"
  },
  "export2_tag": {
    "trunk": "export_tags",
    "type": "object",
    "label": "export2_tag"
  },
  "export2_username": {
    "trunk": "export2_tag",
    "type": "string",
    "label": "export2_username"
  },
  "export2_password": {
    "trunk": "export2_tag",
    "type": "string",
    "label": "export2_password"
  }
}`;
