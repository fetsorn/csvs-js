import csv from "papaparse";

export function insertLine(key, value) {
  return csv.unparse([[key, value]], { delimiter: ",", newline: "\n" });
}
