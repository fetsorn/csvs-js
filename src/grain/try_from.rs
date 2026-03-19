use super::Grain;
use crate::{Error, Result};
use serde_json::Value;
use std::convert::TryFrom;

fn type_name(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Bool(_) => "bool",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "array",
        Value::Object(_) => "object",
    }
}

impl TryFrom<Value> for Grain {
    type Error = Error;

    fn try_from(value: Value) -> Result<Self> {
        match value {
            Value::Object(v) => {
                let base = match v.get("_").unwrap_or(&Value::Null) {
                    Value::String(s) => s,
                    other => return Err(Error::from_message(
                        format!("Grain field '_' must be a string, got {}", type_name(other))
                    )),
                };

                let base_value = if v.contains_key(base) {
                    match &v[base] {
                        Value::String(s) => Some(s),
                        other => return Err(Error::from_message(
                            format!("Grain base value for '{}' must be a string, got {}", base, type_name(other))
                        )),
                    }
                } else {
                    None
                };

                let leaf: Option<(String, Value)> = v
                    .iter()
                    .filter(|(key, _)| (*key != "_") && (*key != base))
                    .try_fold(None, |with_pair, (key, val) | {
                        if with_pair.is_some() {
                            Err(Error::from_message("more than one key in grain"))
                        } else {
                            Ok(Some((key.to_owned(), val.to_owned())))
                        }
                    })?;

                match leaf {
                    None => Ok(Grain {
                        base: base.to_owned(),
                        base_value: base_value.cloned(),
                        leaf: "".to_owned(),
                        leaf_value: None,
                    }),
                    Some((key, val)) => {
                        let leaf_value: Option<String> = match val {
                            Value::String(s) => Some(s.to_owned()),
                            other => return Err(Error::from_message(
                                format!("Grain leaf '{}' value must be a string, got {}", key, type_name(&other))
                            )),
                        };

                        Ok(Grain {
                            base: base.to_owned(),
                            base_value: base_value.cloned(),
                            leaf: key,
                            leaf_value,
                        })
                    }
                }
            }
            other => Err(Error::from_message(
                format!("expected JSON object for Grain, got {}", type_name(&other))
            )),
        }
    }
}
