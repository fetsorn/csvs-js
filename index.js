import nodefs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// won't work in the browser
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findpath(base, pathFragment) {
  const loadpath = join(base, pathFragment);

  const loadtype = nodefs.statSync(loadpath);

  if (loadtype.isFile()) {
    return [pathFragment];
  } else if (loadtype.isDirectory()) {
    const filenames = nodefs.readdirSync(loadpath);

    const entries = filenames.map((filename) => {
      const filepath = join(pathFragment, filename);

      return findpath(base, filepath);
    });

    return entries.flat();
  }
}

function loadContents(pathFragment) {
  const base = "/";

  const paths = findpath(base, pathFragment);

  const entries = paths.map((filename) => {
    const filepath = join(base, filename);

    const contents = nodefs.readFileSync(filepath, { encoding: "utf8" });

    const filenameRelative = filename.replace(new RegExp(`${pathFragment}/`), "");

    return [filenameRelative, contents];
  });

  return Object.fromEntries(entries);
}

export function readDir(loadname) {
  const filePath = path.join(
    __dirname,
    "datasets",
    loadname,
  );

  return filePath;
}

export function readDataset(loadname) {
  const filePath = dir(loadname);

  return loadContents(filePath)
}

export function readTestCase(loadname) {
  const filePath = path.join(
    __dirname,
    "cases",
    loadname,
  );

  return JSON.parse(nodejs.readFileSync(filePath));
}

export function readRecord(loadname) {
  const filePath = path.join(
    __dirname,
    "records",
    loadname,
  );

  return JSON.parse(nodejs.readFileSync(filePath));
}

export function sortObject(a) {
  return Object.keys(a)
    .sort()
    .reduce((obj, key) => ({ ...obj, [key]: a[key] }), {});
}

export function sortList(as) {
  return as
    .map(sortObject)
    .sort((a, b) => (a[a._] < b[b._] ? -1 : 1));
}

export function copy(_path, path) {
  const stats = nodefs.statSync(_path);

  if (!stats.isDirectory()) {
    const content = nodefs.readFileSync(_path, "utf8");

    nodefs.writeFileSync(path, content);

    return;
  }

  if (path != "/" && !nodefs.existsSync(path)) {
    nodefs.mkdirSync(path);
  }

  for (const file of nodefs.readdirSync(_path)) {
    copy(join(_path, file), join(path, file));
  }
}
