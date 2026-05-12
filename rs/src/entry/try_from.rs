use super::Entry;
use crate::{Error, Result};
use serde_json::Value;
use std::collections::HashMap;

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

impl TryFrom<Value> for Entry {
    type Error = Error;

    fn try_from(value: Value) -> Result<Self> {
        match value {
            Value::Object(v) => {
                let base = match v.get("_").unwrap_or(&Value::Null) {
                    Value::String(s) => s,
                    other => return Err(Error::from_message(
                        format!("Entry field '_' must be a string, got {}", type_name(other))
                    )),
                };

                let base_value = if v.contains_key(base) {
                    match &v[base] {
                        Value::String(s) => Some(s),
                        other => return Err(Error::from_message(
                            format!("Entry base value for '{}' must be a string, got {}", base, type_name(other))
                        )),
                    }
                } else {
                    None
                };

                let leader_value = if v.contains_key("__") {
                    match &v["__"] {
                        Value::String(s) => Some(s),
                        other => return Err(Error::from_message(
                            format!("Entry leader value '__' must be a string, got {}", type_name(other))
                        )),
                    }
                } else {
                    None
                };

                // Extract prose keys (starting with "@")
                let mut prose = HashMap::new();

                for (key, val) in v.iter() {
                    if key.starts_with('@') {
                        let lang = if key.len() == 1 {
                            None
                        } else {
                            Some(key[1..].to_owned())
                        };

                        match val {
                            Value::String(s) => { prose.insert(lang, s.to_owned()); }
                            other => return Err(Error::from_message(
                                format!("Prose key '{}' must be a string, got {}", key, type_name(other))
                            )),
                        }
                    }
                }

                let leaves = v
                    .iter()
                    .filter(|(key, _)| (*key != "_") && (*key != base) && (*key != "__") && !key.starts_with('@'))
                    .map(|(key, val)| {
                        let values: Vec<Entry> = match val {
                            Value::String(s) => {
                                vec![Entry {
                                    base: key.to_owned(),
                                    base_value: Some(s.to_owned()),
                                    leader_value: None,
                                    leaves: HashMap::new(),
                                    prose: HashMap::new(),
                                }]
                            }
                            Value::Array(vs) => vs
                                .iter()
                                .map(|v| match v {
                                    Value::String(s) => Ok(Entry {
                                        base: key.to_owned(),
                                        base_value: Some(s.to_owned()),
                                        leader_value: None,
                                        leaves: HashMap::new(),
                                        prose: HashMap::new(),
                                    }),
                                    Value::Object(_) => {
                                        let e: Entry = v.clone().try_into()?;
                                        Ok(e)
                                    }
                                    other => Err(Error::from_message(
                                        format!("Entry leaf '{}' array item must be string or object, got {}", key, type_name(other))
                                    )),
                                })
                                .collect::<Result<Vec<Entry>>>()?,
                            Value::Object(_) => {
                                let e: Entry = val.clone().try_into()?;
                                vec![e]
                            }
                            other => return Err(Error::from_message(
                                format!("Entry leaf '{}' must be string, array, or object, got {}", key, type_name(other))
                            )),
                        };

                        Ok((key.to_owned(), values))
                    })
                    .collect::<Result<HashMap<String, Vec<Entry>>>>()?;

                Ok(Entry {
                    base: base.to_owned(),
                    base_value: base_value.cloned(),
                    leader_value: leader_value.cloned(),
                    leaves,
                    prose,
                })
            }
            other => Err(Error::from_message(
                format!("expected JSON object for Entry, got {}", type_name(&other))
            )),
        }
    }
}

impl TryFrom<String> for Entry {
    type Error = Error;

    fn try_from(value: String) -> Result<Self> {
        let value_json: Value = serde_json::from_str(&value)?;

        value_json.try_into()
    }
}

impl TryFrom<&str> for Entry {
    type Error = Error;

    fn try_from(value: &str) -> Result<Self> {
        let value_json: Value = serde_json::from_str(value)?;

        value_json.try_into()
    }
}

impl TryFrom<&Value> for Entry {
    type Error = Error;

    fn try_from(value: &Value) -> Result<Self> {
        value.clone().try_into()
    }
}
