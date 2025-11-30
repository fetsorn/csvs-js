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
    struct UpdateTest {
        initial: String,
        query: Vec<String>,
        expected: String,
    }

    #[tokio::test]
    async fn update_test() -> Result<()> {
        let tests: Vec<UpdateTest> = read_testcase("update");

        for test in tests.iter() {
            let temp_path = TempDir::new()?;

            copy(&test.initial, temp_path.path());

            let queries: Vec<Entry> = test
                .query
                .iter()
                .map(|query| read_record(&query).try_into())
                .collect::<Result<Vec<Entry>>>()?;

            let dataset = Dataset::new(&temp_path.path().to_owned());

            dataset.update_record(queries).await;

            assert_dir!(temp_path, &test.expected);
        }

        Ok(())
    }
}
