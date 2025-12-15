pub fn query_tablet_stream(
    dataset: Dataset,
    tablet: Tablet,
    state: State,
    is_first_tablet: bool,
) -> impl Stream<Item = Result<State>> {
    let tablet_stream = query_tablet_stream(tablet, state, is_first_tablet);

    // TODO ...

    yield state;
}
