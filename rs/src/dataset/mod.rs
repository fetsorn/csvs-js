mod create;
mod delete;
mod insert;
mod select;
mod update;
mod option;
mod open;
mod query;
mod build;
mod schema;
mod version;
pub mod prose;
use crate::{Entry, Result, Schema};
use futures_core::stream::Stream;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use prose::ProseAddress;

/// A csvs dataset backed by CSV files in a directory.
///
/// Designed for single-writer access. Concurrent writes to the same
/// dataset directory may corrupt data. Use git-based sync for
/// multi-device access.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dataset {
    dir: PathBuf,
    #[serde(skip)]
    schema_cache: Option<Schema>,
    #[serde(skip, default)]
    prose_address: ProseAddress,
}

impl Dataset {
    pub async fn open(dir: &PathBuf) -> Result<Self> {
        open::open(dir).await
    }

    pub async fn create(dir: &PathBuf, nested: bool) -> Result<Self> {
        create::create(dir, nested).await
    }

    /// Pre-load and cache the schema. Subsequent operations will
    /// reuse it instead of reading `_-_.csv` each time.
    pub async fn with_schema(mut self) -> Result<Self> {
        let schema = schema::build_schema(&self).await?;
        self.schema_cache = Some(schema);
        Ok(self)
    }

    /// Get the schema, using the cache if available.
    pub(crate) async fn get_schema(&self) -> Result<Schema> {
        match &self.schema_cache {
            Some(s) => Ok(s.clone()),
            None => schema::build_schema(self).await,
        }
    }

    pub async fn delete_record(self, query: Vec<Entry>) -> Result<()> {
        delete::delete_record(self, query).await?;

        Ok(())
    }

    pub async fn insert_record(self, query: Vec<Entry>) -> Result<()> {
        insert::insert_record(self, query).await?;

        Ok(())
    }

    pub async fn select_record(self, query: Vec<Entry>, light: bool) -> Result<Vec<Entry>> {
        select::select_record(self, query, light).await
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
        build::build_record(self, query, false).await
    }

    pub async fn build_record_with_prose(self, query: Entry) -> Result<Entry> {
        build::build_record(self, query, true).await
    }

    pub fn select_record_stream(self, query: Vec<Entry>, light: bool) -> impl Stream<Item = Result<Entry>> {
        select::select_record_stream(self, query, light)
    }

    pub async fn select_schema(&self) -> Result<Entry> {
        schema::select_schema(self).await
    }

    pub async fn build_schema(&self) -> Result<Schema> {
        self.get_schema().await
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
