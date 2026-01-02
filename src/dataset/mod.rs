mod create;
mod delete;
mod insert;
mod select;
mod update;
mod option;
mod query;
mod build;
mod schema;
mod version;
use crate::{Entry, Result, Schema};
use futures_core::stream::Stream;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dataset {
    dir: PathBuf,
}

impl Dataset {
    pub fn new(dir: &PathBuf) -> Self {
        Dataset { dir: dir.clone() }
    }

    pub fn create(&self, name: &str) -> Result<()> {
        create::create_dataset(self, name);

        Ok(())
    }

    pub async fn delete_record(self, query: Vec<Entry>) -> Result<()> {
        delete::delete_record(self, query).await?;

        Ok(())
    }

    pub async fn insert_record(self, query: Vec<Entry>) -> Result<()> {
        insert::insert_record(self, query).await?;

        Ok(())
    }

    pub async fn select_record(self, query: Vec<Entry>) -> Result<Vec<Entry>> {
        select::select_record(self, query).await
    }


    pub fn select_option_stream(self, query: Entry) -> impl Stream<Item = Result<Entry>> {
        option::select_option_stream(self, query)
    }

    pub async fn select_option(self, query: Entry) -> Result<Vec<Entry>> {
        option::select_option(self, query).await
    }

    pub fn query_record_stream(self, query: Entry) -> impl Stream<Item = Result<Entry>> {
        query::query_record_stream(self, query)
    }

    pub async fn query_record(self, query: Entry) -> Result<Vec<Entry>> {
        query::query_record(self, query).await
    }

    pub async fn build_record(self, query: Entry) -> Result<Entry> {
        build::build_record(self, query).await
    }

    pub fn select_record_stream<S>(self, input: S) -> impl Stream<Item = Result<Entry>>
    where
        S: Stream<Item = Result<Entry>>,
    {
        select::select_record_stream(self, input)
    }

    pub async fn select_schema(&self) -> Result<Entry> {
        schema::select_schema(self).await
    }

    pub async fn build_schema(&self) -> Result<Schema> {
        schema::build_schema(self).await
    }

    pub async fn select_version(&self) -> Result<Entry> {
        version::select_version(self).await
    }

    pub async fn update_record(self, query: Vec<Entry>) -> Result<()> {
        update::update_record(self, query).await
    }

    pub async fn update_schema(&self, query: Entry) -> Result<()> {
        schema::update_schema(self, query).await
    }

    pub async fn update_version(&self, query: Entry) -> Result<()> {
        version::update_version(self, query).await
    }

    pub async fn print_record(self, query: Vec<Entry>) -> Result<()> {
        select::print_record(self, query).await
    }
}
