import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch, useSelector } from 'react-redux';
import { rememberSearch, searchTrains } from './trainSlice.js';
import { formatDuration, formatFare, formatTime, fromSearchParams, getAvailabilityStatus, getToday, sortResults } from './searchUtils.js';
import './styles/home-page.css';

export default function TrainSearchResultsPage() {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const trains = useSelector((state) => state.trains);
  const today = useMemo(() => getToday(), []);
  const search = useMemo(() => fromSearchParams(searchParams, today), [searchParams, today]);
  const sortedResults = useMemo(() => sortResults(trains.results), [trains.results]);

  useEffect(() => {
    if (!search.source || !search.destination || search.source === search.destination) return;
    dispatch(rememberSearch(search));
    if (!trains.hasSearched || JSON.stringify(trains.selectedSearch) !== JSON.stringify(search)) dispatch(searchTrains(search));
  }, [dispatch, search, trains.hasSearched, trains.selectedSearch]);

  const hasValidSearch = search.source && search.destination && search.source !== search.destination;

  return (
    <main className="sr-home-page sr-results-page">
      <Container maxWidth="xl">
        <Paper className="sr-results-shell" elevation={0}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box>
              <Button component={Link} to="/" startIcon={<ArrowBackIcon />} variant="text">Modify search</Button>
              <Typography variant="h2">Train availability</Typography>
              <Typography color="text.secondary">{hasValidSearch ? `${search.source} → ${search.destination} · ${search.journeyDate} · ${search.travelClass} · ${search.quota}` : 'Start a valid train search from the home page.'}</Typography>
            </Box>
            <Chip icon={<SearchIcon />} color="primary" label={trains.loading ? 'Searching inventory' : `${sortedResults.length} services found`} />
          </Stack>

          {!hasValidSearch && <Alert severity="warning">Source and destination are required before availability results can be shown.</Alert>}
          {hasValidSearch && trains.error && <Alert severity="error">{trains.error}</Alert>}
          {hasValidSearch && trains.loading && <Alert severity="info">Checking route inventory and class availability.</Alert>}
          {hasValidSearch && !trains.loading && !trains.error && sortedResults.length === 0 && <Alert severity="info">No trains are available for this route, date, and class. Try another class, date, or reverse route.</Alert>}

          <Stack spacing={1.25}>
            {sortedResults.map((train) => <SearchResultRow key={train.trainId} train={train} search={search} />)}
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}

function SearchResultRow({ train, search }) {
  const availability = getAvailabilityStatus(train);
  const canBook = availability.canBook;
  const bookingParams = new URLSearchParams({ sourceStationCode: train.sourceCode || search?.source || '', destinationStationCode: train.destinationCode || search?.destination || '', journeyDate: search?.journeyDate || getToday(), travelClass: search?.travelClass || '3A', quota: search?.quota || 'GENERAL' });
  return <article className="sr-live-result-row"><div><strong>{train.trainName || 'Train'}</strong><span>{train.trainNumber || '-'} · {search?.travelClass || '3A'} · {search?.quota || 'GENERAL'}</span></div><div className="sr-live-result-route"><b>{formatTime(train.departureTime)}</b><span>{train.sourceCode || search?.source}</span><i /> <small>{formatDuration(train.durationMinutes)}</small><i /><b>{formatTime(train.arrivalTime)}</b><span>{train.destinationCode || search?.destination}</span></div><div><b className={canBook ? 'sr-status-good' : 'sr-status-stop'}>{availability.detail}</b><strong>{formatFare(train.fare)}</strong><a className={canBook ? '' : 'sr-disabled-booking'} href={canBook ? `/booking/${train.trainId}?${bookingParams.toString()}` : '#'} onClick={(event) => { if (!canBook) event.preventDefault(); }}>{canBook ? 'Reserve seat' : availability.label}</a></div></article>;
}
