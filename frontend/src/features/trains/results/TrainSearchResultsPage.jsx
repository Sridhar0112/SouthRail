import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Container, Paper, Stack } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { rememberSearch, searchTrains } from '../trainSlice.js';
import { fromSearchParams, getToday, searchKey, sortResults } from '../searchUtils.js';
import ResultsHeader from './components/ResultsHeader.jsx';
import SearchResultRow from './components/SearchResultRow.jsx';
import '../home/home.css';

export default function TrainSearchResultsPage() {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const trains = useSelector((state) => state.trains);
  const today = useMemo(() => getToday(), []);
  const search = useMemo(() => fromSearchParams(searchParams, today), [searchParams, today]);
  const sortedResults = useMemo(() => sortResults(trains.results), [trains.results]);
  const hasValidSearch = search.source && search.destination && search.source !== search.destination;
  const currentKey = useMemo(() => searchKey(search), [search]);
  const selectedKey = useMemo(() => searchKey(trains.selectedSearch), [trains.selectedSearch]);

  useEffect(() => {
    if (!hasValidSearch) return;
    dispatch(rememberSearch(search));
    if (!trains.hasSearched || selectedKey !== currentKey) dispatch(searchTrains(search));
  }, [currentKey, dispatch, hasValidSearch, search, selectedKey, trains.hasSearched]);

  return (
    <main className="sr-home-page sr-results-page">
      <Container maxWidth="xl">
        <Paper className="sr-results-shell" elevation={0}>
          <ResultsHeader hasValidSearch={hasValidSearch} search={search} loading={trains.loading} count={sortedResults.length} />
          {!hasValidSearch && <Alert severity="warning">Source and destination are required before availability results can be shown.</Alert>}
          {hasValidSearch && trains.error && <Alert severity="error">{trains.error}</Alert>}
          {hasValidSearch && trains.loading && <Alert severity="info">Checking route inventory and class availability.</Alert>}
          {hasValidSearch && !trains.loading && !trains.error && sortedResults.length === 0 && <Alert severity="info">No trains are available for this route, date, and class. Try another class, date, or reverse route.</Alert>}
          <Stack spacing={1.25}>{sortedResults.map((train) => <SearchResultRow key={train.trainId} train={train} search={search} />)}</Stack>
        </Paper>
      </Container>
    </main>
  );
}
