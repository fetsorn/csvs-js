mod test {
    use std::fs;
    use temp_dir::TempDir;
    use serde::{Deserialize, Serialize};
    use csvs::{
        Result,
        Entry, Grain, Dataset
    };
    use csvs_test::{read_record, copy, read_testcase, assert_dir};

    #[derive(Debug, Serialize, Deserialize, Clone)]
    struct InitTest {
        initial: String,
        expected: String,
    }

    #[tokio::test]
    async fn init_test() -> Result<()> {
        let tests: Vec<InitTest> = read_testcase("init");

        for test in tests.iter() {
            let temp_path = TempDir::new()?;

            copy(&test.initial, temp_path.path());

            let dataset = Dataset::create(&temp_path.path().to_owned(), true).await?;

            assert_dir!(temp_path, &test.expected);
        }

        Ok(())
    }
}
