import path from "path";
import { pruneLine } from "./line.js";

export function pruneTablet(fs, dir, tablet) {
  // createReadStream
  const filepath = path.join(dir, tablet.filename);

  const contents = fs.existsSync(filepath)
    ? fs.readFileSync(filepath, "utf8")
    : "";

  // TODO replace with file stream
  const lines = contents.split("\n");

  // TODO createWriteStream to tmp, rename tmp to origin
  let output = [];

  for (const line of lines) {
    const isMatch = pruneLine(tablet, line);

    if (!isMatch) {
      output.push(line);
    }
  }

  const contentsNew = output.sort().join("\n");

  if (contentsNew !== "") {
    const contentsNewline = `${contentsNew}\n`;

    fs.writeFileSync(filepath, contentsNewline);
  }
}
