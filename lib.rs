pub fn read_record(loadname: &str) -> Value {
    let path = format!("./records/{}.json", loadname);

    let file = fs::File::open(entry_path).expect("file should open read only");

    let json: Value = serde_json::from_reader(entry_file).expect("file should be proper JSON");

    json
}

pub fn read_dataset_dir(loadname: &str) -> Path {
    let path = format!("./datasets/{}.json", loadname);

    path
}

pub fn read_testcase<R>(loadname: &str) -> Vec<R> {
    let path = format!("./cases/{}.json", loadname);

    let file = fs::File::open(path).expect("file should open read only");

    let tests: Vec<R> = serde_json::from_reader(file).expect("file should be proper JSON");

    tests
}

pub fn copy(initial_path: Path, temp_path: Path) {
    for file_entry in fs::read_dir(&initial_path)? {
        let file_entry = file_entry?;

        let file_type = file_entry.file_type()?;

        if file_type.is_dir() {
        } else {
            fs::copy(
                file_entry.path(),
                temp_path.as_ref().join(file_entry.file_name()),
            )?;
        }
    }
}
