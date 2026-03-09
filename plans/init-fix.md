# Plan: Fix test failures csvs/ directory structure refactor

`csvs.init({ fs, dir })` with default `bare: false` does **nothing** when `dir/csvs` doesn't exist. The function's non-bare path (line 39 of csvs-js `init/index.js`) only acts if `csvsdir` already exists — it should create a directory from scratch.

Additionally, with `bare: false` and an existing `csvsdir`, the function creates a double-nested `csvs/csvs/.csvs.csv` structure, which is not what we want.
