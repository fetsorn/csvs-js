import csv from "papaparse";

export function updateLine(key, value) {
  return csv.unparse([[key, value]], { delimiter: ",", newline: "\n" });
}
