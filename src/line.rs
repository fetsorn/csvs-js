use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Ord, Eq, PartialEq, PartialOrd)]
pub struct Line {
    pub key: String,
    pub value: String,
}

fn escape(s: &str) -> String {
    let re = Regex::new(r"\n").unwrap();

    re.replace_all(s, "\\n").to_string()
}

fn unescape(s: &str) -> String {
    let re = Regex::new(r"\\n").unwrap();

    re.replace_all(s, "\n").to_string()
}

impl Line {
    pub fn escape(&self) -> Line {
        Line {
            key: escape(&self.key),
            value: escape(&self.value),
        }
    }

    pub fn unescape(&self) -> Line {
        Line {
            key: unescape(&self.key),
            value: unescape(&self.value),
        }
    }
}
