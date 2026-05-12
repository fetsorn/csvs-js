use crate::Entry;

/// Inter-tablet communication state.
/// Passed from one tablet to the next in the orchestrator.
#[derive(Debug, Clone)]
pub struct State {
    pub query: Entry,
    pub entry: Option<Entry>,
    /// The parent key being joined against — tells child tablets
    /// which key to match. Previously called "thingQuerying".
    pub thing_querying: Option<String>,
}

impl State {
    pub fn new(query: Entry) -> Self {
        State {
            query,
            entry: None,
            thing_querying: None,
        }
    }
}
